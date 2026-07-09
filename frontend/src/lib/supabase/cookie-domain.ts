import type { NextRequest } from 'next/server';
import { AUTH_ENV_KEYS, getEnv } from '@landi-flow/auth/env';

/**
 * Shared cookie Domain for Landi production hosts only.
 * Avoid hard-coding domain on *.workers.dev and local dev.
 */
export function productionCookieDomain(request: NextRequest): string | undefined {
  if (process.env.NODE_ENV !== 'production') {
    return undefined;
  }

  const configuredRoot = getEnv(AUTH_ENV_KEYS.rootDomain, process.env);
  const rootDomain = configuredRoot?.toLowerCase().replace(/^\./, '') ?? 'landi.build';

  const forwarded = request.headers.get('x-forwarded-host');
  const raw = forwarded
    ? forwarded.split(',')[0].trim().split(':')[0]
    : (request.headers.get('host') ?? '').split(':')[0];
  const host = raw.toLowerCase();

  if (host === rootDomain || host.endsWith(`.${rootDomain}`)) {
    return `.${rootDomain}`;
  }

  return undefined;
}

/** Prefer actual request host (Workers custom domain) over build-time env. */
export function originFromForwardedHeaders(
  forwardedHost: string | null,
  forwardedProto: string | null,
  host: string | null
): string | undefined {
  if (forwardedHost) {
    const resolvedHost = forwardedHost.split(',')[0].trim();
    const proto = (forwardedProto ?? 'https').split(',')[0].trim() || 'https';
    return `${proto}://${resolvedHost}`;
  }
  if (host) {
    const resolvedHost = host.split(',')[0].trim();
    const proto = (forwardedProto ?? 'https').split(',')[0].trim() || 'https';
    return `${proto}://${resolvedHost}`;
  }
  return undefined;
}

export function requestOrigin(request: NextRequest): string {
  const fromHeaders = originFromForwardedHeaders(
    request.headers.get('x-forwarded-host'),
    request.headers.get('x-forwarded-proto'),
    request.headers.get('host')
  );
  if (fromHeaders) {
    return fromHeaders;
  }

  const configuredSite = getEnv(AUTH_ENV_KEYS.siteUrl, process.env);
  if (configuredSite) {
    try {
      return new URL(configuredSite).origin;
    } catch {
      /* fall through */
    }
  }

  return request.nextUrl.origin;
}

function resolveOAuthCallbackOrigin(explicitOrigin?: string): string {
  if (explicitOrigin) {
    return explicitOrigin;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  const siteUrl = getEnv(AUTH_ENV_KEYS.siteUrl, process.env);
  if (siteUrl) {
    try {
      return new URL(siteUrl).origin;
    } catch {
      return siteUrl.replace(/\/$/, '');
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `${AUTH_ENV_KEYS.siteUrl} is required for OAuth redirect when request origin is unknown`
    );
  }

  return 'http://localhost:3000';
}

/** OAuth/email callback URL — pass `window.location.origin` from client handlers. */
export function buildOAuthRedirectUrl(
  nextPath: string = '/workspace/inbox',
  origin?: string
): string {
  const base = resolveOAuthCallbackOrigin(origin);
  const callback = new URL('/auth/callback', base);
  callback.searchParams.set('next', nextPath);
  return callback.toString();
}
