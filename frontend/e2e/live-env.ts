/**
 * Guards `@requires-live-api` Playwright specs — skips when production persistence
 * env is incomplete. Never fakes pass: missing config → explicit skip.
 */

export interface LiveApiEnvStatus {
  ready: boolean;
  reason: string | null;
}

function isTruthyEnv(name: string): boolean {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

/** True when mock auth is explicitly disabled (unset or any value other than "true"). */
export function isMockAuthDisabled(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_AUTH !== 'true';
}

/** Resolves E2E credentials — override via env for non-default test tenants. */
export function getE2eTestCredentials(): { email: string; password: string } {
  return {
    email: process.env.E2E_TEST_EMAIL?.trim() || 'test@example.com',
    password: process.env.E2E_TEST_PASSWORD?.trim() || 'TestPassword123!',
  };
}

/** All prerequisites for live Supabase session + Workers API persistence proof. */
export function getLiveApiEnvStatus(): LiveApiEnvStatus {
  if (!isMockAuthDisabled()) {
    return {
      ready: false,
      reason: 'NEXT_PUBLIC_MOCK_AUTH must not be "true" (unset or false for live API path)',
    };
  }

  if (!isTruthyEnv('FLOW_API_URL')) {
    return {
      ready: false,
      reason: 'FLOW_API_URL is required (Next.js proxy → Workers API)',
    };
  }

  if (!isTruthyEnv('NEXT_PUBLIC_SUPABASE_URL')) {
    return {
      ready: false,
      reason: 'NEXT_PUBLIC_SUPABASE_URL is required for real sign-in',
    };
  }

  if (!isTruthyEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
    return {
      ready: false,
      reason: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required for real sign-in',
    };
  }

  return { ready: true, reason: null };
}

export function isLiveApiEnvReady(): boolean {
  return getLiveApiEnvStatus().ready;
}
