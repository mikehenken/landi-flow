import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import {
  getBearerTokenFromAuthorizationHeader,
  getBearerTokenFromRequest,
} from '@landi-flow/auth/jwt';
import { AUTH_ENV_KEYS, requireEnv } from '@landi-flow/auth/env';
import type { LinearCloneSupabaseClient } from '@landi-flow/auth';
import { LINEAR_CLONE_SCHEMA } from '@landi-flow/auth/schema';

export {
  getBearerTokenFromAuthorizationHeader,
  getBearerTokenFromRequest,
};

export function createClientWithBearerAccessToken(accessToken: string): LinearCloneSupabaseClient {
  return createSupabaseClient(
    requireEnv(AUTH_ENV_KEYS.supabaseUrl, process.env),
    requireEnv(AUTH_ENV_KEYS.supabaseAnonKey, process.env),
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
  );
}

export async function createClientForRouteRequest(
  request?: Request | null
): Promise<LinearCloneSupabaseClient> {
  if (request) {
    const token = getBearerTokenFromRequest(request);
    if (token) {
      return createClientWithBearerAccessToken(token);
    }
  }
  return createClient();
}
