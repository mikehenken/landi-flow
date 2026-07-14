/**
 * Unified inbound-credential resolution for the MCP endpoint. Accepts three
 * bearer modes (per Linear's pragmatic MCP surface):
 *   1. Personal API key  (`lcf_sk_…`)         → scoped, revocable, resource-bound
 *   2. OAuth access token (`lcf_at_…`)         → opaque DB-backed, instant revoke
 *   3. Supabase user JWT                        → human acting as themselves
 *
 * The pipeline is: extract → resolve → expiry/revocation → RFC 8707 audience →
 * (scope + readonly enforced later at the tool layer). Failures are uniform.
 */
import { getBearerTokenFromRequest, verifyBearerAuth } from '@landi-flow/auth/jwt';
import type { DbClient } from '../lib/db.js';
import { hashSecret } from '../lib/crypto.js';
import { DEFAULT_API_KEY_SCOPES } from './scopes.js';
import { touchCredentialLastUsed, verifyApiKey } from './credentials.js';
import type { McpWorkerEnv } from '../env.js';

export interface McpPrincipal {
  type: 'api_key' | 'oauth_token' | 'supabase_user';
  userId: string | null;
  workspaceId: string | null;
  agentId: string | null;
  scopes: string[];
  readonly: boolean;
  actorType: 'human' | 'agent';
  credentialId?: string;
  clientId?: string;
  resource?: string | null;
}

export type AuthOutcome =
  | { ok: true; principal: McpPrincipal }
  | { ok: false; reason: string };

function authEnvRecord(env: McpWorkerEnv): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export async function authenticateMcpRequest(
  request: Request,
  env: McpWorkerEnv,
  db: DbClient,
  resourceUri: string
): Promise<AuthOutcome> {
  const token = getBearerTokenFromRequest(request);
  if (!token) {
    return { ok: false, reason: 'missing_token' };
  }

  // 1. Personal API key
  if (token.startsWith('lcf_sk_')) {
    const result = await verifyApiKey(db, env.MCP_CREDENTIAL_PEPPER, token);
    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }
    const cred = result.credential;
    if (cred.resource_uri && cred.resource_uri !== resourceUri) {
      return { ok: false, reason: 'audience_mismatch' };
    }
    await touchCredentialLastUsed(db, cred.id);
    return {
      ok: true,
      principal: {
        type: 'api_key',
        userId: cred.user_id,
        workspaceId: cred.workspace_id,
        agentId: cred.agent_id,
        scopes: cred.scopes.length > 0 ? cred.scopes : DEFAULT_API_KEY_SCOPES,
        readonly: cred.readonly,
        actorType: cred.agent_id ? 'agent' : 'human',
        credentialId: cred.id,
        resource: cred.resource_uri,
      },
    };
  }

  // 2. OAuth access token (opaque, DB-backed)
  if (token.startsWith('lcf_at_')) {
    const tokenHash = await hashSecret(token, env.MCP_CREDENTIAL_PEPPER);
    const { data } = await db
      .from('oauth_tokens')
      .select('*')
      .eq('access_token_hash', tokenHash)
      .maybeSingle();
    if (!data) {
      return { ok: false, reason: 'not_found' };
    }
    const row = data as {
      id: string;
      client_id: string;
      user_id: string | null;
      workspace_id: string;
      agent_id: string | null;
      actor_type: 'user' | 'app';
      scopes: string[];
      resource: string | null;
      readonly: boolean;
      expires_at: string;
      revoked_at: string | null;
    };
    if (row.revoked_at) {
      return { ok: false, reason: 'revoked' };
    }
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      return { ok: false, reason: 'expired' };
    }
    if (row.resource && row.resource !== resourceUri) {
      return { ok: false, reason: 'audience_mismatch' };
    }
    await db
      .from('oauth_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', row.id);
    return {
      ok: true,
      principal: {
        type: 'oauth_token',
        userId: row.user_id,
        workspaceId: row.workspace_id,
        agentId: row.agent_id,
        scopes: row.scopes,
        readonly: row.readonly,
        actorType: row.actor_type === 'app' ? 'agent' : 'human',
        credentialId: row.id,
        clientId: row.client_id,
        resource: row.resource,
      },
    };
  }

  // 3. Supabase user JWT (human acting as themselves)
  const auth = await verifyBearerAuth(request, authEnvRecord(env));
  if ('status' in auth) {
    return { ok: false, reason: 'invalid_supabase_jwt' };
  }
  return {
    ok: true,
    principal: {
      type: 'supabase_user',
      userId: auth.user.id,
      workspaceId: null,
      agentId: null,
      scopes: DEFAULT_API_KEY_SCOPES,
      readonly: false,
      actorType: 'human',
    },
  };
}

/** Resolve the workspace for a request. api_key/oauth tokens are workspace-bound. */
export function resolveWorkspaceId(
  principal: McpPrincipal,
  requestedWorkspaceId?: string | null
): string | null {
  if (principal.workspaceId) {
    return principal.workspaceId;
  }
  return requestedWorkspaceId ?? null;
}
