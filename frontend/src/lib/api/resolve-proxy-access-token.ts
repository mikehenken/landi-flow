import type { LinearCloneSupabaseClient } from '@landi-flow/auth';

/**
 * Resolves a bearer token for upstream API proxying.
 * Refreshes the session when cookies exist but access_token is missing/expired.
 */
export async function resolveProxyAccessToken(
  supabase: LinearCloneSupabaseClient,
): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    return session.access_token;
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    return null;
  }

  return refreshed.session?.access_token ?? null;
}
