/**
 * OAuth 2.1 authorization server for the MCP resource server.
 * Implements the MCP-mandated subset:
 *  - RFC 9728 Protected Resource Metadata + RFC 8414 Authorization Server Metadata
 *  - RFC 7591 Dynamic Client Registration (consent-gated, non-admin scopes)
 *  - Authorization Code + PKCE (S256) with RFC 8707 `resource` audience binding
 *  - Refresh token rotation with reuse detection (revoke family)
 *  - client_credentials (actor=app) for agents acting as an app user
 *  - RFC 7009 token revocation (opaque DB-backed tokens → instant revocation)
 */
import { verifyBearerAuth } from '@landi-flow/auth/jwt';
import type { DbClient } from '../lib/db.js';
import { recordCredentialAudit } from '../lib/audit.js';
import { errorResponse, jsonResponse } from '../lib/http.js';
import {
  base64UrlDecode,
  hashSecret,
  randomToken,
  verifyPkceS256,
} from '../lib/crypto.js';
import { resolveIssuer, resolveResourceUri, type McpWorkerEnv } from '../env.js';
import {
  generateClientSecret,
  verifyClientSecret,
} from './credentials.js';
import { ALL_MCP_SCOPES, parseScopeString, sanitizeRequestedScopes } from './scopes.js';

const ACCESS_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24h
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30d
const AUTH_CODE_TTL_SECONDS = 5 * 60; // 5m
const ACCESS_TOKEN_PREFIX = 'lcf_at_';
const REFRESH_TOKEN_PREFIX = 'lcf_rt_';
const AUTH_CODE_PREFIX = 'lcf_ac_';

interface OAuthClientRow {
  id: string;
  workspace_id: string | null;
  client_id: string;
  client_secret_hash: string | null;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  scopes: string[];
  is_public: boolean;
  token_endpoint_auth_method: string;
  revoked_at: string | null;
}

interface TokenPair {
  access_token: string;
  refresh_token?: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
}

function authEnvRecord(env: McpWorkerEnv): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export class OAuthService {
  private readonly issuer: string;
  private readonly resourceUri: string;
  private readonly pepper?: string;

  constructor(
    private readonly db: DbClient,
    private readonly env: McpWorkerEnv,
    requestUrl: URL
  ) {
    this.issuer = resolveIssuer(env, requestUrl);
    this.resourceUri = resolveResourceUri(env, requestUrl);
    this.pepper = env.MCP_CREDENTIAL_PEPPER;
  }

  // --- Discovery metadata -------------------------------------------------

  protectedResourceMetadata(): Response {
    return jsonResponse({
      resource: this.resourceUri,
      authorization_servers: [this.issuer],
      bearer_methods_supported: ['header'],
      scopes_supported: ALL_MCP_SCOPES,
      resource_documentation: `${this.issuer}/`,
    });
  }

  authorizationServerMetadata(): Response {
    return jsonResponse({
      issuer: this.issuer,
      authorization_endpoint: `${this.issuer}/authorize`,
      token_endpoint: `${this.issuer}/token`,
      registration_endpoint: `${this.issuer}/register`,
      revocation_endpoint: `${this.issuer}/revoke`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
      scopes_supported: ALL_MCP_SCOPES,
    });
  }

  // --- RFC 7591 Dynamic Client Registration -------------------------------

  async register(request: Request): Promise<Response> {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return errorResponse('invalid_client_metadata', 'Body must be JSON', 400);
    }

    const redirectUris = Array.isArray(body.redirect_uris)
      ? (body.redirect_uris as unknown[]).filter((u): u is string => typeof u === 'string')
      : [];
    const authMethod =
      typeof body.token_endpoint_auth_method === 'string'
        ? body.token_endpoint_auth_method
        : 'none';
    const clientName = typeof body.client_name === 'string' ? body.client_name : 'MCP Client';
    const requestedScopes = sanitizeRequestedScopes(
      parseScopeString(typeof body.scope === 'string' ? body.scope : undefined)
    );

    // HTTPS-only redirect URIs (localhost excepted for dev).
    for (const uri of redirectUris) {
      if (!isValidRedirectUri(uri)) {
        return errorResponse('invalid_redirect_uri', `Invalid redirect_uri: ${uri}`, 400);
      }
    }

    const isConfidential = authMethod !== 'none';
    const generated = isConfidential ? await generateClientSecret(this.pepper) : null;
    const clientId = generated?.clientId ?? `lcf_client_${randomToken(12)}`;

    const { data, error } = await this.db
      .from('oauth_clients')
      .insert({
        client_id: clientId,
        client_secret_hash: generated?.clientSecretHash ?? null,
        client_name: clientName,
        redirect_uris: redirectUris,
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: authMethod,
        scopes: requestedScopes,
        is_public: !isConfidential,
        dynamically_registered: true,
      })
      .select('id, client_id, created_at')
      .single();

    if (error || !data) {
      return errorResponse('server_error', `Registration failed: ${error?.message ?? ''}`, 500);
    }

    await recordCredentialAudit(this.db, {
      event: 'registered',
      credentialKind: 'dcr_client',
      request,
      detail: { client_id: clientId, client_name: clientName, dynamic: true },
    });

    return jsonResponse(
      {
        client_id: clientId,
        ...(generated ? { client_secret: generated.clientSecret } : {}),
        client_name: clientName,
        redirect_uris: redirectUris,
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: authMethod,
        scope: requestedScopes.join(' '),
      },
      201
    );
  }

  // --- Authorization Code + PKCE ------------------------------------------

  /**
   * GET /authorize. Requires the user's Supabase session (Authorization: Bearer)
   * to establish consent identity (IDE clients present the user token). Issues a
   * single-use, PKCE-bound code and redirects to the client redirect_uri.
   */
  async authorize(request: Request, url: URL): Promise<Response> {
    const params = url.searchParams;
    const responseType = params.get('response_type');
    const clientId = params.get('client_id');
    const redirectUri = params.get('redirect_uri');
    const codeChallenge = params.get('code_challenge');
    const codeChallengeMethod = params.get('code_challenge_method') ?? 'S256';
    const state = params.get('state');
    const resource = params.get('resource');
    const workspaceId = params.get('workspace_id');
    const scope = sanitizeRequestedScopes(parseScopeString(params.get('scope')));

    if (responseType !== 'code') {
      return errorResponse('unsupported_response_type', 'Only response_type=code is supported', 400);
    }
    if (!clientId || !codeChallenge) {
      return errorResponse('invalid_request', 'client_id and code_challenge are required', 400);
    }
    if (codeChallengeMethod !== 'S256') {
      return errorResponse('invalid_request', 'code_challenge_method must be S256', 400);
    }
    if (resource && resource !== this.resourceUri) {
      return errorResponse('invalid_target', 'resource does not match this MCP server', 400);
    }
    if (!workspaceId) {
      return errorResponse('invalid_request', 'workspace_id is required for consent', 400);
    }

    const client = await this.loadClient(clientId);
    if (!client) {
      return errorResponse('invalid_client', 'Unknown client_id', 400);
    }
    if (redirectUri && client.redirect_uris.length > 0 && !client.redirect_uris.includes(redirectUri)) {
      return errorResponse('invalid_request', 'redirect_uri not registered for client', 400);
    }

    // Establish consenting user identity from the Supabase session.
    const auth = await verifyBearerAuth(request, authEnvRecord(this.env));
    if ('status' in auth) {
      return errorResponse(
        'login_required',
        'Authenticate with a Supabase session (Authorization: Bearer) to grant consent',
        401
      );
    }
    const userId = auth.user.id;

    // The consenting user must be a member of the target workspace.
    const isMember = await this.isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      return errorResponse('access_denied', 'Not a member of the requested workspace', 403);
    }

    const code = `${AUTH_CODE_PREFIX}${randomToken(24)}`;
    const codeHash = await hashSecret(code, this.pepper);
    const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000).toISOString();

    const { error } = await this.db.from('oauth_authorization_codes').insert({
      code_hash: codeHash,
      client_id: clientId,
      user_id: userId,
      workspace_id: workspaceId,
      redirect_uri: redirectUri ?? '',
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      scopes: scope,
      resource: resource ?? this.resourceUri,
      expires_at: expiresAt,
    });
    if (error) {
      return errorResponse('server_error', `Failed to persist code: ${error.message}`, 500);
    }

    await recordCredentialAudit(this.db, {
      event: 'authorized',
      workspaceId,
      actorId: userId,
      credentialKind: 'oauth_token',
      request,
      detail: { client_id: clientId, scopes: scope },
    });

    if (redirectUri) {
      const location = new URL(redirectUri);
      location.searchParams.set('code', code);
      if (state) {
        location.searchParams.set('state', state);
      }
      return new Response(null, { status: 302, headers: { Location: location.toString() } });
    }

    // No redirect_uri (e.g. device/manual flow): return the code as JSON.
    return jsonResponse({ code, state: state ?? undefined });
  }

  // --- Token endpoint -----------------------------------------------------

  async token(request: Request): Promise<Response> {
    const form = await readForm(request);
    const grantType = form.get('grant_type');

    if (grantType === 'authorization_code') {
      return this.exchangeAuthorizationCode(request, form);
    }
    if (grantType === 'refresh_token') {
      return this.refresh(request, form);
    }
    if (grantType === 'client_credentials') {
      return this.clientCredentials(request, form);
    }
    return errorResponse('unsupported_grant_type', `Unsupported grant_type: ${grantType}`, 400);
  }

  private async exchangeAuthorizationCode(request: Request, form: URLSearchParams): Promise<Response> {
    const code = form.get('code');
    const codeVerifier = form.get('code_verifier');
    const clientId = form.get('client_id') ?? extractBasicClientId(request);
    const resource = form.get('resource');

    if (!code || !codeVerifier || !clientId) {
      return errorResponse('invalid_request', 'code, code_verifier, and client_id are required', 400);
    }

    const client = await this.loadClient(clientId);
    if (!client) {
      return errorResponse('invalid_client', 'Unknown client', 401);
    }
    const clientAuthError = await this.authenticateClient(request, form, client);
    if (clientAuthError) {
      return clientAuthError;
    }

    const codeHash = await hashSecret(code, this.pepper);
    const { data: codeRow } = await this.db
      .from('oauth_authorization_codes')
      .select('*')
      .eq('code_hash', codeHash)
      .maybeSingle();

    if (!codeRow) {
      return errorResponse('invalid_grant', 'Invalid or expired authorization code', 400);
    }
    const row = codeRow as {
      id: string;
      client_id: string;
      user_id: string;
      workspace_id: string;
      code_challenge: string;
      scopes: string[];
      resource: string | null;
      expires_at: string;
      consumed_at: string | null;
    };

    if (row.consumed_at) {
      return errorResponse('invalid_grant', 'Authorization code already used', 400);
    }
    if (row.client_id !== clientId) {
      return errorResponse('invalid_grant', 'Code was issued to a different client', 400);
    }
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      return errorResponse('invalid_grant', 'Authorization code expired', 400);
    }
    if (resource && row.resource && resource !== row.resource) {
      return errorResponse('invalid_target', 'resource mismatch', 400);
    }
    const pkceOk = await verifyPkceS256(codeVerifier, row.code_challenge);
    if (!pkceOk) {
      return errorResponse('invalid_grant', 'PKCE verification failed', 400);
    }

    // Single-use: consume the code.
    await this.db
      .from('oauth_authorization_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', row.id);

    const pair = await this.issueTokenPair({
      clientId,
      userId: row.user_id,
      workspaceId: row.workspace_id,
      actorType: 'user',
      grantType: 'authorization_code',
      scopes: row.scopes,
      resource: row.resource ?? this.resourceUri,
      withRefresh: true,
    });

    await recordCredentialAudit(this.db, {
      event: 'token_issued',
      workspaceId: row.workspace_id,
      actorId: row.user_id,
      credentialKind: 'oauth_token',
      request,
      detail: { client_id: clientId, grant_type: 'authorization_code' },
    });

    return jsonResponse(pair);
  }

  private async refresh(request: Request, form: URLSearchParams): Promise<Response> {
    const refreshToken = form.get('refresh_token');
    const clientId = form.get('client_id') ?? extractBasicClientId(request);
    if (!refreshToken || !clientId) {
      return errorResponse('invalid_request', 'refresh_token and client_id are required', 400);
    }

    const client = await this.loadClient(clientId);
    if (!client) {
      return errorResponse('invalid_client', 'Unknown client', 401);
    }
    const clientAuthError = await this.authenticateClient(request, form, client);
    if (clientAuthError) {
      return clientAuthError;
    }

    const refreshHash = await hashSecret(refreshToken, this.pepper);
    const { data: tokenRow } = await this.db
      .from('oauth_tokens')
      .select('*')
      .eq('refresh_token_hash', refreshHash)
      .maybeSingle();

    if (!tokenRow) {
      return errorResponse('invalid_grant', 'Invalid refresh token', 400);
    }
    const row = tokenRow as {
      id: string;
      client_id: string;
      user_id: string | null;
      workspace_id: string;
      agent_id: string | null;
      actor_type: 'user' | 'app';
      scopes: string[];
      resource: string | null;
      readonly: boolean;
      refresh_family_id: string | null;
      revoked_at: string | null;
      refresh_expires_at: string | null;
    };

    // Reuse detection: a revoked (already-rotated) refresh token replay ⇒ compromise.
    if (row.revoked_at) {
      if (row.refresh_family_id) {
        await this.db
          .from('oauth_tokens')
          .update({ revoked_at: new Date().toISOString(), revoked_reason: 'refresh_reuse_detected' })
          .eq('refresh_family_id', row.refresh_family_id)
          .is('revoked_at', null);
      }
      await recordCredentialAudit(this.db, {
        event: 'token_refresh_reuse',
        workspaceId: row.workspace_id,
        actorId: row.user_id,
        credentialKind: 'oauth_token',
        request,
        detail: { client_id: clientId, family_revoked: true },
      });
      return errorResponse('invalid_grant', 'Refresh token reuse detected', 400);
    }
    if (row.client_id !== clientId) {
      return errorResponse('invalid_grant', 'Refresh token issued to a different client', 400);
    }
    if (row.refresh_expires_at && new Date(row.refresh_expires_at).getTime() <= Date.now()) {
      return errorResponse('invalid_grant', 'Refresh token expired', 400);
    }

    // Rotate: revoke the presented token, issue a new pair in the same family.
    await this.db
      .from('oauth_tokens')
      .update({ revoked_at: new Date().toISOString(), revoked_reason: 'rotated' })
      .eq('id', row.id);

    const pair = await this.issueTokenPair({
      clientId,
      userId: row.user_id,
      workspaceId: row.workspace_id,
      agentId: row.agent_id,
      actorType: row.actor_type,
      grantType: 'refresh_token',
      scopes: row.scopes,
      resource: row.resource ?? this.resourceUri,
      readonly: row.readonly,
      withRefresh: true,
      refreshFamilyId: row.refresh_family_id ?? undefined,
    });

    await recordCredentialAudit(this.db, {
      event: 'token_refreshed',
      workspaceId: row.workspace_id,
      actorId: row.user_id,
      credentialKind: 'oauth_token',
      request,
      detail: { client_id: clientId },
    });

    return jsonResponse(pair);
  }

  private async clientCredentials(request: Request, form: URLSearchParams): Promise<Response> {
    const clientId = form.get('client_id') ?? extractBasicClientId(request);
    const resource = form.get('resource');
    const requestedScopes = sanitizeRequestedScopes(parseScopeString(form.get('scope')));
    if (!clientId) {
      return errorResponse('invalid_request', 'client_id is required', 400);
    }

    const client = await this.loadClient(clientId);
    if (!client) {
      return errorResponse('invalid_client', 'Unknown client', 401);
    }
    if (!client.grant_types.includes('client_credentials')) {
      return errorResponse('unauthorized_client', 'client_credentials not enabled for this client', 400);
    }
    if (!client.workspace_id) {
      return errorResponse('invalid_client', 'Client is not bound to a workspace', 400);
    }
    // client_credentials is a confidential flow — secret required.
    const clientAuthError = await this.authenticateClient(request, form, client, true);
    if (clientAuthError) {
      return clientAuthError;
    }
    if (resource && resource !== this.resourceUri) {
      return errorResponse('invalid_target', 'resource mismatch', 400);
    }

    // Ensure a first-class agent principal for actor=app (feeds agents-as-assignees).
    const { data: agentData, error: agentError } = await this.db.rpc('ensure_mcp_agent', {
      p_workspace_id: client.workspace_id,
      p_installed_by: null,
      p_display_name: client.client_name,
    });
    if (agentError) {
      return errorResponse('server_error', `Failed to provision agent: ${agentError.message}`, 500);
    }
    const agentId = (agentData as { id?: string } | null)?.id ?? null;

    const scopes = requestedScopes.filter((s) => client.scopes.length === 0 || client.scopes.includes(s));

    const pair = await this.issueTokenPair({
      clientId,
      userId: null,
      workspaceId: client.workspace_id,
      agentId,
      actorType: 'app',
      grantType: 'client_credentials',
      scopes: scopes.length > 0 ? scopes : requestedScopes,
      resource: this.resourceUri,
      withRefresh: false,
    });

    await recordCredentialAudit(this.db, {
      event: 'token_issued',
      workspaceId: client.workspace_id,
      credentialKind: 'app_token',
      request,
      detail: { client_id: clientId, grant_type: 'client_credentials', agent_id: agentId },
    });

    return jsonResponse(pair);
  }

  // --- RFC 7009 revocation ------------------------------------------------

  async revoke(request: Request): Promise<Response> {
    const form = await readForm(request);
    const token = form.get('token');
    const hint = form.get('token_type_hint');
    if (!token) {
      return errorResponse('invalid_request', 'token is required', 400);
    }

    const tokenHash = await hashSecret(token, this.pepper);
    // If the hint mislabels the token the server MUST search all supported types.
    const columns = hint === 'refresh_token'
      ? ['refresh_token_hash', 'access_token_hash']
      : ['access_token_hash', 'refresh_token_hash'];

    for (const column of columns) {
      const { data } = await this.db
        .from('oauth_tokens')
        .update({ revoked_at: new Date().toISOString(), revoked_reason: 'client_revocation' })
        .eq(column, tokenHash)
        .is('revoked_at', null)
        .select('id, workspace_id')
        .maybeSingle();
      if (data) {
        await recordCredentialAudit(this.db, {
          event: 'revoked',
          workspaceId: (data as { workspace_id: string }).workspace_id,
          credentialId: (data as { id: string }).id,
          credentialKind: 'oauth_token',
          request,
        });
        break;
      }
    }

    // RFC 7009: always return 200 regardless of whether the token existed.
    return jsonResponse({ ok: true });
  }

  // --- Helpers ------------------------------------------------------------

  private async issueTokenPair(input: {
    clientId: string;
    userId: string | null;
    workspaceId: string;
    agentId?: string | null;
    actorType: 'user' | 'app';
    grantType: string;
    scopes: string[];
    resource: string;
    readonly?: boolean;
    withRefresh: boolean;
    refreshFamilyId?: string;
  }): Promise<TokenPair> {
    const accessToken = `${ACCESS_TOKEN_PREFIX}${randomToken(32)}`;
    const accessTokenHash = await hashSecret(accessToken, this.pepper);
    const now = Date.now();
    const expiresAt = new Date(now + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString();

    let refreshToken: string | undefined;
    let refreshTokenHash: string | null = null;
    let refreshExpiresAt: string | null = null;
    const refreshFamilyId = input.withRefresh
      ? input.refreshFamilyId ?? crypto.randomUUID()
      : null;

    if (input.withRefresh) {
      refreshToken = `${REFRESH_TOKEN_PREFIX}${randomToken(32)}`;
      refreshTokenHash = await hashSecret(refreshToken, this.pepper);
      refreshExpiresAt = new Date(now + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString();
    }

    const { error } = await this.db.from('oauth_tokens').insert({
      client_id: input.clientId,
      user_id: input.userId,
      workspace_id: input.workspaceId,
      agent_id: input.agentId ?? null,
      actor_type: input.actorType,
      grant_type: input.grantType,
      scopes: input.scopes,
      resource: input.resource,
      readonly: input.readonly ?? false,
      access_token_hash: accessTokenHash,
      refresh_token_hash: refreshTokenHash,
      refresh_family_id: refreshFamilyId,
      expires_at: expiresAt,
      refresh_expires_at: refreshExpiresAt,
    });
    if (error) {
      throw new Error(`Failed to persist token: ${error.message}`);
    }

    return {
      access_token: accessToken,
      ...(refreshToken ? { refresh_token: refreshToken } : {}),
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      scope: input.scopes.join(' '),
    };
  }

  private async loadClient(clientId: string): Promise<OAuthClientRow | null> {
    const { data } = await this.db
      .from('oauth_clients')
      .select('*')
      .eq('client_id', clientId)
      .is('revoked_at', null)
      .maybeSingle();
    return (data as OAuthClientRow | null) ?? null;
  }

  /**
   * Authenticate a confidential client. Public clients (auth method `none`) pass
   * unless `requireSecret` forces confidential behavior (client_credentials).
   */
  private async authenticateClient(
    request: Request,
    form: URLSearchParams,
    client: OAuthClientRow,
    requireSecret = false
  ): Promise<Response | null> {
    const isConfidential = client.token_endpoint_auth_method !== 'none' || requireSecret;
    if (!isConfidential) {
      return null;
    }
    if (!client.client_secret_hash) {
      return errorResponse('invalid_client', 'Client has no secret configured', 401);
    }
    const presented = form.get('client_secret') ?? extractBasicClientSecret(request);
    if (!presented) {
      return errorResponse('invalid_client', 'client_secret required', 401);
    }
    const ok = await verifyClientSecret(this.pepper, presented, client.client_secret_hash);
    if (!ok) {
      return errorResponse('invalid_client', 'Invalid client credentials', 401);
    }
    return null;
  }

  async isWorkspaceMember(userId: string, workspaceId: string): Promise<boolean> {
    const { data } = await this.db
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    return Boolean(data);
  }
}

// --- Module helpers -------------------------------------------------------

async function readForm(request: Request): Promise<URLSearchParams> {
  const contentType = request.headers.get('Content-Type') ?? '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return new URLSearchParams(await request.text());
  }
  if (contentType.includes('application/json')) {
    try {
      const json = (await request.json()) as Record<string, unknown>;
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(json)) {
        if (value !== undefined && value !== null) {
          params.set(key, String(value));
        }
      }
      return params;
    } catch {
      return new URLSearchParams();
    }
  }
  return new URLSearchParams(await request.text());
}

function decodeBasicAuth(request: Request): { id: string; secret: string } | null {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Basic ')) {
    return null;
  }
  try {
    const decoded = new TextDecoder().decode(base64UrlDecode(header.slice(6).replace(/=+$/, '')));
    const idx = decoded.indexOf(':');
    if (idx === -1) {
      return null;
    }
    return {
      id: decodeURIComponent(decoded.slice(0, idx)),
      secret: decodeURIComponent(decoded.slice(idx + 1)),
    };
  } catch {
    return null;
  }
}

function extractBasicClientId(request: Request): string | null {
  return decodeBasicAuth(request)?.id ?? null;
}

function extractBasicClientSecret(request: Request): string | null {
  return decodeBasicAuth(request)?.secret ?? null;
}

function isValidRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    if (parsed.protocol === 'https:') {
      return true;
    }
    // Allow http only for loopback (native/dev clients).
    if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      return true;
    }
    // Custom scheme (native app callbacks) permitted.
    return parsed.protocol !== 'http:' && parsed.protocol !== 'https:';
  } catch {
    return false;
  }
}
