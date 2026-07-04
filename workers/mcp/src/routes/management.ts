/**
 * User-facing credential management REST API. This is how a user "connects THEIR
 * agent": they mint a personal API key (optionally provisioning a first-class agent
 * principal) or, as a workspace admin, register an OAuth app (client_id/secret) that
 * an external IDE client or agent runtime uses to obtain tokens.
 *
 * Auth: Supabase user session (Authorization: Bearer <jwt>). Membership/admin is
 * verified against workspace_members. Raw secrets are returned exactly ONCE.
 */
import { verifyBearerAuth } from '@landi-flow/auth/jwt';
import type { DbClient } from '../lib/db.js';
import { errorResponse, jsonResponse } from '../lib/http.js';
import { recordCredentialAudit } from '../lib/audit.js';
import {
  generateClientId,
  generateClientSecret,
  issueApiKey,
  revokeApiKey,
} from '../auth/credentials.js';
import { DEFAULT_API_KEY_SCOPES, sanitizeRequestedScopes } from '../auth/scopes.js';
import type { McpWorkerEnv } from '../env.js';

function authEnvRecord(env: McpWorkerEnv): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function requireUser(request: Request, env: McpWorkerEnv): Promise<{ userId: string } | Response> {
  const auth = await verifyBearerAuth(request, authEnvRecord(env));
  if ('status' in auth) {
    return errorResponse('unauthorized', auth.message, auth.status);
  }
  return { userId: auth.user.id };
}

async function isWorkspaceMember(db: DbClient, userId: string, workspaceId: string): Promise<boolean> {
  const { data } = await db
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  return Boolean(data);
}

async function isWorkspaceAdmin(db: DbClient, userId: string, workspaceId: string): Promise<boolean> {
  const { data } = await db
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  const role = (data as { role?: string } | null)?.role;
  return role === 'owner' || role === 'admin' || role === 'team_owner';
}

/**
 * Routes under /api/mcp/*. Returns null when the path is not a management route.
 */
export async function handleManagementRequest(
  request: Request,
  env: McpWorkerEnv,
  db: DbClient,
  url: URL
): Promise<Response | null> {
  const path = url.pathname;

  // --- Personal API keys -------------------------------------------------
  if (path === '/api/mcp/keys') {
    const authed = await requireUser(request, env);
    if (authed instanceof Response) {
      return authed;
    }

    if (request.method === 'POST') {
      return createApiKey(request, env, db, authed.userId);
    }
    if (request.method === 'GET') {
      const workspaceId = url.searchParams.get('workspace_id');
      if (!workspaceId) {
        return errorResponse('invalid_request', 'workspace_id query param is required', 400);
      }
      if (!(await isWorkspaceMember(db, authed.userId, workspaceId))) {
        return errorResponse('forbidden', 'Not a workspace member', 403);
      }
      const { data, error } = await db
        .from('mcp_credentials')
        .select('id, name, kind, agent_id, key_prefix, scopes, readonly, resource_uri, expires_at, last_used_at, revoked_at, created_at')
        .eq('workspace_id', workspaceId)
        .eq('user_id', authed.userId)
        .order('created_at', { ascending: false });
      if (error) {
        return errorResponse('server_error', error.message, 500);
      }
      return jsonResponse({ keys: data ?? [] });
    }
    return errorResponse('method_not_allowed', 'Method not allowed', 405);
  }

  const keyMatch = /^\/api\/mcp\/keys\/([^/]+)$/.exec(path);
  if (keyMatch && request.method === 'DELETE') {
    const authed = await requireUser(request, env);
    if (authed instanceof Response) {
      return authed;
    }
    const credentialId = keyMatch[1];
    const { data: owned } = await db
      .from('mcp_credentials')
      .select('id, workspace_id, user_id')
      .eq('id', credentialId)
      .maybeSingle();
    const row = owned as { workspace_id: string; user_id: string } | null;
    if (!row || row.user_id !== authed.userId) {
      return errorResponse('not_found', 'Credential not found', 404);
    }
    const revoked = await revokeApiKey(db, credentialId, 'user_revocation');
    await recordCredentialAudit(db, {
      event: 'revoked',
      workspaceId: row.workspace_id,
      actorId: authed.userId,
      credentialId,
      credentialKind: 'api_key',
      request,
    });
    return jsonResponse({ ok: true, revoked });
  }

  // --- OAuth apps (admin) ------------------------------------------------
  if (path === '/api/mcp/oauth-clients') {
    const authed = await requireUser(request, env);
    if (authed instanceof Response) {
      return authed;
    }

    if (request.method === 'POST') {
      return createOAuthClient(request, env, db, authed.userId);
    }
    if (request.method === 'GET') {
      const workspaceId = url.searchParams.get('workspace_id');
      if (!workspaceId) {
        return errorResponse('invalid_request', 'workspace_id query param is required', 400);
      }
      if (!(await isWorkspaceMember(db, authed.userId, workspaceId))) {
        return errorResponse('forbidden', 'Not a workspace member', 403);
      }
      const { data, error } = await db
        .from('oauth_clients')
        .select('id, client_id, client_name, redirect_uris, grant_types, scopes, is_public, dynamically_registered, created_at, revoked_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      if (error) {
        return errorResponse('server_error', error.message, 500);
      }
      return jsonResponse({ clients: data ?? [] });
    }
    return errorResponse('method_not_allowed', 'Method not allowed', 405);
  }

  const clientMatch = /^\/api\/mcp\/oauth-clients\/([^/]+)$/.exec(path);
  if (clientMatch && request.method === 'DELETE') {
    const authed = await requireUser(request, env);
    if (authed instanceof Response) {
      return authed;
    }
    const clientPk = clientMatch[1];
    const { data: client } = await db
      .from('oauth_clients')
      .select('id, workspace_id')
      .eq('id', clientPk)
      .maybeSingle();
    const row = client as { workspace_id: string | null } | null;
    if (!row || !row.workspace_id) {
      return errorResponse('not_found', 'Client not found', 404);
    }
    if (!(await isWorkspaceAdmin(db, authed.userId, row.workspace_id))) {
      return errorResponse('forbidden', 'Workspace admin required', 403);
    }
    await db
      .from('oauth_clients')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', clientPk);
    // Revoke derived tokens (cascade).
    await db
      .from('oauth_tokens')
      .update({ revoked_at: new Date().toISOString(), revoked_reason: 'client_revoked' })
      .eq('client_id', (await getClientId(db, clientPk)) ?? '')
      .is('revoked_at', null);
    await recordCredentialAudit(db, {
      event: 'revoked',
      workspaceId: row.workspace_id,
      actorId: authed.userId,
      credentialId: clientPk,
      credentialKind: 'oauth_client',
      request,
    });
    return jsonResponse({ ok: true });
  }

  return null;
}

async function getClientId(db: DbClient, pk: string): Promise<string | null> {
  const { data } = await db.from('oauth_clients').select('client_id').eq('id', pk).maybeSingle();
  return (data as { client_id?: string } | null)?.client_id ?? null;
}

async function createApiKey(
  request: Request,
  env: McpWorkerEnv,
  db: DbClient,
  userId: string
): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse('invalid_request', 'Body must be JSON', 400);
  }

  const workspaceId = typeof body.workspace_id === 'string' ? body.workspace_id : '';
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'MCP key';
  if (!workspaceId) {
    return errorResponse('invalid_request', 'workspace_id is required', 400);
  }
  if (!(await isWorkspaceMember(db, userId, workspaceId))) {
    return errorResponse('forbidden', 'Not a workspace member', 403);
  }

  const requestedScopes = Array.isArray(body.scopes)
    ? sanitizeRequestedScopes((body.scopes as unknown[]).map((s) => String(s)))
    : DEFAULT_API_KEY_SCOPES;
  const readonly = body.readonly === true;
  const expiresAt = typeof body.expires_at === 'string' ? body.expires_at : null;
  const resourceUri = typeof body.resource_uri === 'string' ? body.resource_uri : env.MCP_RESOURCE_URI ?? null;

  // Optionally provision a first-class agent principal so the key "connects an agent".
  let agentId: string | null = null;
  if (body.connect_agent === true) {
    const displayName =
      typeof body.agent_display_name === 'string' && body.agent_display_name.trim()
        ? body.agent_display_name.trim()
        : `${name} (agent)`;
    const { data: agent, error: agentError } = await db.rpc('ensure_mcp_agent', {
      p_workspace_id: workspaceId,
      p_installed_by: userId,
      p_display_name: displayName,
    });
    if (agentError) {
      return errorResponse('server_error', `Failed to provision agent: ${agentError.message}`, 500);
    }
    agentId = (agent as { id?: string } | null)?.id ?? null;
  }

  const issued = await issueApiKey(db, env.MCP_CREDENTIAL_PEPPER, {
    workspaceId,
    userId,
    agentId,
    name,
    scopes: requestedScopes,
    readonly,
    resourceUri,
    expiresAt,
  });

  await recordCredentialAudit(db, {
    event: 'issued',
    workspaceId,
    actorId: userId,
    credentialId: issued.credential.id,
    credentialKind: 'api_key',
    request,
    detail: { name, scopes: requestedScopes, readonly, agent_id: agentId },
  });

  // Raw key returned ONCE.
  return jsonResponse(
    {
      credential: issued.credential,
      api_key: issued.plaintextKey,
      warning: 'Store this key now — it will not be shown again.',
    },
    201
  );
}

async function createOAuthClient(
  request: Request,
  env: McpWorkerEnv,
  db: DbClient,
  userId: string
): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse('invalid_request', 'Body must be JSON', 400);
  }

  const workspaceId = typeof body.workspace_id === 'string' ? body.workspace_id : '';
  const clientName =
    typeof body.client_name === 'string' && body.client_name.trim()
      ? body.client_name.trim()
      : 'MCP OAuth App';
  if (!workspaceId) {
    return errorResponse('invalid_request', 'workspace_id is required', 400);
  }
  if (!(await isWorkspaceAdmin(db, userId, workspaceId))) {
    return errorResponse('forbidden', 'Workspace admin required to register an OAuth app', 403);
  }

  const redirectUris = Array.isArray(body.redirect_uris)
    ? (body.redirect_uris as unknown[]).filter((u): u is string => typeof u === 'string')
    : [];
  const scopes = Array.isArray(body.scopes)
    ? sanitizeRequestedScopes((body.scopes as unknown[]).map((s) => String(s)))
    : DEFAULT_API_KEY_SCOPES;
  const clientCredentialsEnabled = body.client_credentials === true;
  const isPublic = body.public === true;

  const grantTypes = ['authorization_code', 'refresh_token'];
  if (clientCredentialsEnabled) {
    grantTypes.push('client_credentials');
  }

  const generated = isPublic ? null : await generateClientSecret(env.MCP_CREDENTIAL_PEPPER);
  const clientId = generated?.clientId ?? generateClientId();

  const { data, error } = await db
    .from('oauth_clients')
    .insert({
      workspace_id: workspaceId,
      client_id: clientId,
      client_secret_hash: generated?.clientSecretHash ?? null,
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: grantTypes,
      response_types: ['code'],
      token_endpoint_auth_method: isPublic ? 'none' : 'client_secret_post',
      scopes,
      is_public: isPublic,
      dynamically_registered: false,
      created_by: userId,
    })
    .select('id, client_id, client_name, redirect_uris, grant_types, scopes, is_public, created_at')
    .single();

  if (error || !data) {
    return errorResponse('server_error', `Failed to create client: ${error?.message ?? ''}`, 500);
  }

  await recordCredentialAudit(db, {
    event: 'issued',
    workspaceId,
    actorId: userId,
    credentialId: (data as { id: string }).id,
    credentialKind: 'oauth_client',
    request,
    detail: { client_id: clientId, client_credentials: clientCredentialsEnabled },
  });

  return jsonResponse(
    {
      client: data,
      ...(generated ? { client_secret: generated.clientSecret } : {}),
      warning: generated ? 'Store the client_secret now — it will not be shown again.' : undefined,
    },
    201
  );
}
