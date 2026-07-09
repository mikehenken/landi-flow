import { describe, expect, it } from 'vitest';
import type { NextRequest } from 'next/server';
import {
  buildOAuthRedirectUrl,
  originFromForwardedHeaders,
  requestOrigin,
} from './cookie-domain';

describe('originFromForwardedHeaders', () => {
  it('prefers x-forwarded-host over host', () => {
    expect(
      originFromForwardedHeaders('canvas.landi.build', 'https', 'localhost:3000')
    ).toBe('https://canvas.landi.build');
  });

  it('falls back to host when forwarded host is absent', () => {
    expect(originFromForwardedHeaders(null, 'https', 'canvas.landi.build')).toBe(
      'https://canvas.landi.build'
    );
  });
});

describe('requestOrigin', () => {
  it('uses forwarded headers before configured site URL', () => {
    const request = {
      headers: new Headers({
        'x-forwarded-host': 'canvas.landi.build',
        'x-forwarded-proto': 'https',
      }),
      nextUrl: new URL('http://localhost:3000/auth/callback'),
    } as NextRequest;

    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
    try {
      expect(requestOrigin(request)).toBe('https://canvas.landi.build');
    } finally {
      process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });
});

describe('buildOAuthRedirectUrl', () => {
  it('uses explicit origin for OAuth callback', () => {
    expect(buildOAuthRedirectUrl('/workspace/inbox', 'https://canvas.landi.build')).toBe(
      'https://canvas.landi.build/auth/callback?next=%2Fworkspace%2Finbox'
    );
  });

  it('does not default to localhost when explicit production origin is passed', () => {
    const url = buildOAuthRedirectUrl('/workspace', 'https://canvas.landi.build');
    expect(url).not.toContain('localhost');
    expect(url.startsWith('https://canvas.landi.build/auth/callback')).toBe(true);
  });
});
