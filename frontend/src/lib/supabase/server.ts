import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { AUTH_ENV_KEYS, requireEnv } from '@landi-flow/auth/env';
import type { LinearCloneSupabaseClient } from '@landi-flow/auth';
import { LINEAR_CLONE_SCHEMA } from '@landi-flow/auth/schema';

function productionCookieDomainFromEnv(): string | undefined {
  const root = process.env[AUTH_ENV_KEYS.rootDomain];
  if (!root) {
    return undefined;
  }
  return root.startsWith('.') ? root : `.${root}`;
}

export async function createClient(): Promise<LinearCloneSupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv(AUTH_ENV_KEYS.supabaseUrl, process.env),
    requireEnv(AUTH_ENV_KEYS.supabaseAnonKey, process.env),
    {
      db: { schema: LINEAR_CLONE_SCHEMA },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                domain:
                  process.env.NODE_ENV === 'production'
                    ? productionCookieDomainFromEnv()
                    : undefined,
              })
            );
          } catch {
            // Ignored in Server Components where cookies are read-only
          }
        },
      },
    }
  );
}

export function createServiceClient(): LinearCloneSupabaseClient {
  return createSupabaseClient(
    requireEnv(AUTH_ENV_KEYS.supabaseUrl, process.env),
    requireEnv(AUTH_ENV_KEYS.supabaseServiceRoleKey, process.env),
    {
      db: { schema: LINEAR_CLONE_SCHEMA },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export function createServiceClientIfConfigured(): LinearCloneSupabaseClient | null {
  const url = process.env[AUTH_ENV_KEYS.supabaseUrl];
  const key = process.env[AUTH_ENV_KEYS.supabaseServiceRoleKey];
  if (!url || !key) {
    return null;
  }
  return createSupabaseClient(url, key, {
    db: { schema: LINEAR_CLONE_SCHEMA },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
