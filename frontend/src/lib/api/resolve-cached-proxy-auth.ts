import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { resolveProxyAccessToken } from '@/lib/api/resolve-proxy-access-token';

export type CachedProxyAuth =
  | { ok: true; accessToken: string }
  | { ok: false };

/**
 * Request-scoped auth resolution (PERF-04).
 * React `cache()` dedupes within a single App Router request lifecycle.
 */
const resolveProxyAuthCached = cache(async (): Promise<CachedProxyAuth> => {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false };
  }

  const accessToken = await resolveProxyAccessToken(supabase);
  if (!accessToken) {
    return { ok: false };
  }

  return { ok: true, accessToken };
});

/**
 * In-flight singleflight keyed by Cookie header so parallel `/api/v1/*` hops
 * during bootstrap share one getUser + token resolve. Settled entries are
 * dropped immediately (no long-lived token cache).
 */
const inFlightByCookie = new Map<string, Promise<CachedProxyAuth>>();

export function resolveCachedProxyAuth(cookieHeader: string): Promise<CachedProxyAuth> {
  const key = cookieHeader.length > 0 ? cookieHeader : '__anon__';
  const existing = inFlightByCookie.get(key);
  if (existing) {
    return existing;
  }

  const promise = resolveProxyAuthCached().finally(() => {
    inFlightByCookie.delete(key);
  });
  inFlightByCookie.set(key, promise);
  return promise;
}
