import {
  AUTH_ENV_KEYS,
  hasSupabaseServiceConfig,
  hasSupabaseUserClientConfig,
  requireEnv,
} from '@landi-flow/auth/env';
import {
  jsonAuthError,
  verifyBearerAuth,
  type AuthFailure,
  type VerifiedAuthResult,
} from '@landi-flow/auth/jwt';

export interface ApiWorkerEnv {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ENABLE_OUTBOX_EMITTER?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PRO_MONTHLY?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  LIVEBLOCKS_SECRET_KEY?: string;
  LIVEBLOCKS_WEBHOOK_SECRET?: string;
  OBS_ERROR_SINK_URL?: string;
  ASKS_INTAKE_WEBHOOK_SECRET?: string;
}

export function toAuthEnv(env: ApiWorkerEnv): Record<string, string | undefined> {
  return {
    [AUTH_ENV_KEYS.supabaseUrl]: env.NEXT_PUBLIC_SUPABASE_URL,
    [AUTH_ENV_KEYS.supabaseAnonKey]: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    [AUTH_ENV_KEYS.supabaseServiceRoleKey]: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function assertWorkerAuthEnv(env: ApiWorkerEnv): void {
  requireEnv(AUTH_ENV_KEYS.supabaseUrl, toAuthEnv(env));
  requireEnv(AUTH_ENV_KEYS.supabaseAnonKey, toAuthEnv(env));
}

export async function requireAuthenticatedRequest(
  request: Request,
  env: ApiWorkerEnv
): Promise<VerifiedAuthResult | Response> {
  assertWorkerAuthEnv(env);
  const result = await verifyBearerAuth(request, toAuthEnv(env));
  if ('status' in result) {
    return jsonAuthError(result as AuthFailure);
  }
  return result;
}

export function isAuthConfigured(env: ApiWorkerEnv): boolean {
  return hasSupabaseUserClientConfig(toAuthEnv(env));
}

export function isServiceRoleConfigured(env: ApiWorkerEnv): boolean {
  return hasSupabaseServiceConfig(toAuthEnv(env));
}

export const PUBLIC_API_PATHS = ['/health', '/api/health'] as const;

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
