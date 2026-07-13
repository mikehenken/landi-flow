import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '@/lib/api/client';
import { buildLoginRedirectPath, isAuthFailure } from './recover-session';

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
  it('encodes return path in login query', () => {
    expect(buildLoginRedirectPath('/workspace/inbox')).toBe(
      '/auth/login?redirect=%2Fworkspace%2Finbox',
    );
  });
});
