import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '@/lib/api/client';
import {
  buildLoginRedirectPath,
  extractLocaleFromPath,
  isAuthFailure,
} from './recover-session';

describe('isAuthFailure', () => {
  it('detects ApiRequestError 401', () => {
    expect(isAuthFailure(new ApiRequestError('Authentication required', 401, 'unauthorized', null))).toBe(
      true,
    );
  });

  it('detects message-based auth failures', () => {
    expect(isAuthFailure(new Error('Authentication required'))).toBe(true);
    expect(isAuthFailure(new Error('Unauthorized'))).toBe(true);
  });

  it('ignores non-auth errors', () => {
    expect(isAuthFailure(new Error('Route not found'))).toBe(false);
    expect(isAuthFailure(new ApiRequestError('Not found', 404, null, null))).toBe(false);
  });
});

describe('buildLoginRedirectPath', () => {
  it('encodes return path in login query with default locale', () => {
    expect(buildLoginRedirectPath('/workspace/inbox')).toBe(
      '/en/auth/login?redirect=%2Fworkspace%2Finbox',
    );
  });

  it('includes locale prefix when provided', () => {
    expect(buildLoginRedirectPath('/workspace/inbox', 'en')).toBe(
      '/en/auth/login?redirect=%2Fworkspace%2Finbox',
    );
  });
});

describe('extractLocaleFromPath', () => {
  it('reads locale from pathname', () => {
    expect(extractLocaleFromPath('/en/workspace/inbox')).toBe('en');
  });

  it('falls back to default locale', () => {
    expect(extractLocaleFromPath('/workspace/inbox')).toBe('en');
  });
});
