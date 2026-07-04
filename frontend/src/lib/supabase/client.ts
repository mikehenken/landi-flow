import { createBrowserClient } from '@supabase/ssr';
import { AUTH_ENV_KEYS, requireEnv } from '@landi-flow/auth/env';
import { LINEAR_CLONE_SCHEMA } from '@landi-flow/auth/schema';

/**
 * Browser Supabase client — cookie-backed PKCE session (real auth, no mock).
 */
export function createClient() {
  return createBrowserClient(
    requireEnv(AUTH_ENV_KEYS.supabaseUrl, process.env),
    requireEnv(AUTH_ENV_KEYS.supabaseAnonKey, process.env),
    {
      db: { schema: LINEAR_CLONE_SCHEMA },
      isSingleton: true,
    }
  );
}

export function createLinearCloneBrowserClient() {
  return createClient();
}
