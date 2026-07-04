/** Supabase / site env key names — values loaded at runtime, never logged. */
export const AUTH_ENV_KEYS = {
  supabaseUrl: 'NEXT_PUBLIC_SUPABASE_URL',
  supabaseAnonKey: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  supabaseServiceRoleKey: 'SUPABASE_SERVICE_ROLE_KEY',
  supabaseProjectRef: 'SUPABASE_PROJECT_REF',
  siteUrl: 'NEXT_PUBLIC_SITE_URL',
  rootDomain: 'NEXT_PUBLIC_ROOT_DOMAIN',
  bypassEmailConfirmation: 'NEXT_PUBLIC_BYPASS_EMAIL_CONFIRMATION',
} as const;

export type AuthEnvKey = (typeof AUTH_ENV_KEYS)[keyof typeof AUTH_ENV_KEYS];

export function requireEnv(name: string, env: Record<string, string | undefined>): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getEnv(name: string, env: Record<string, string | undefined>): string | undefined {
  return env[name];
}

export function hasSupabaseUserClientConfig(env: Record<string, string | undefined>): boolean {
  return Boolean(env[AUTH_ENV_KEYS.supabaseUrl] && env[AUTH_ENV_KEYS.supabaseAnonKey]);
}

export function hasSupabaseServiceConfig(env: Record<string, string | undefined>): boolean {
  return hasSupabaseUserClientConfig(env) && Boolean(env[AUTH_ENV_KEYS.supabaseServiceRoleKey]);
}
