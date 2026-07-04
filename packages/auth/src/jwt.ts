import { createClient } from '@supabase/supabase-js';
import { AUTH_ENV_KEYS, requireEnv } from './env.js';
import { LINEAR_CLONE_SCHEMA } from './schema.js';
import type { LinearCloneSupabaseClient } from './supabase-client.js';

export interface VerifiedAuthResult {
  user: import('@supabase/supabase-js').User;
  supabase: LinearCloneSupabaseClient;
}

export interface AuthFailure {
  status: number;
  message: string;
}

export function getBearerTokenFromAuthorizationHeader(
  authorizationHeader: string | null
): string | null {
  if (!authorizationHeader?.trim()) {
    return null;
  }
  const match = /^Bearer\s+(\S+)/i.exec(authorizationHeader.trim());
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

export function getBearerTokenFromRequest(request: Request): string | null {
  return getBearerTokenFromAuthorizationHeader(request.headers.get('Authorization'));
}

export function createUserScopedClient(
  accessToken: string,
  env: Record<string, string | undefined>
): LinearCloneSupabaseClient {
  return createClient(
    requireEnv(AUTH_ENV_KEYS.supabaseUrl, env),
    requireEnv(AUTH_ENV_KEYS.supabaseAnonKey, env),
    {
      db: { schema: LINEAR_CLONE_SCHEMA },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  ) as LinearCloneSupabaseClient;
}

export function createServiceRoleClient(
  env: Record<string, string | undefined>
): LinearCloneSupabaseClient {
  return createClient(
    requireEnv(AUTH_ENV_KEYS.supabaseUrl, env),
    requireEnv(AUTH_ENV_KEYS.supabaseServiceRoleKey, env),
    {
      db: { schema: LINEAR_CLONE_SCHEMA },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  ) as LinearCloneSupabaseClient;
}

/**
 * Verify Bearer JWT from Workers API / MCP requests.
 * Uses Supabase auth.getUser(jwt) — no mock fallback.
 */
export async function verifyBearerAuth(
  request: Request,
  env: Record<string, string | undefined>
): Promise<VerifiedAuthResult | AuthFailure> {
  const token = getBearerTokenFromRequest(request);
  if (!token) {
    return { status: 401, message: 'Missing Authorization Bearer token' };
  }

  try {
    const supabase = createUserScopedClient(token, env);
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return { status: 401, message: error?.message ?? 'Invalid or expired token' };
    }

    return { user: data.user, supabase };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Auth verification failed';
    return { status: 500, message };
  }
}

export function jsonAuthError(failure: AuthFailure): Response {
  return new Response(JSON.stringify({ error: failure.message }), {
    status: failure.status,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer realm="landi-flow"',
    },
  });
}
