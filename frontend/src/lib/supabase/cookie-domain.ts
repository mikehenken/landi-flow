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

export function requestOrigin(request: NextRequest): string {
  const configuredSite = getEnv(AUTH_ENV_KEYS.siteUrl, process.env);
  if (configuredSite) {
    try {
      return new URL(configuredSite).origin;
    } catch {
      /* fall through */
    }
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedHost) {
    const host = forwardedHost.split(',')[0].trim();
    const proto = (forwardedProto ?? 'https').split(',')[0].trim() || 'https';
    return `${proto}://${host}`;
  }
  return request.nextUrl.origin;
}

export function buildOAuthRedirectUrl(nextPath: string = '/workspace/inbox'): string {
  const siteUrl = getEnv(AUTH_ENV_KEYS.siteUrl, process.env);
  const base = siteUrl ?? 'http://localhost:3000';
  const callback = new URL('/auth/callback', base);
  callback.searchParams.set('next', nextPath);
  return callback.toString();
}
