import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  createUserScopedClient,
  getBearerTokenFromAuthorizationHeader,
  getBearerTokenFromRequest,
  jsonAuthError,
  verifyBearerAuth,
} from './jwt';

const mockGetUser = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

describe('getBearerTokenFromAuthorizationHeader', () => {
  it('extracts Bearer token', () => {
    expect(getBearerTokenFromAuthorizationHeader('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(getBearerTokenFromAuthorizationHeader('bearer lowercase')).toBe('lowercase');
  });

  it('returns null for invalid headers', () => {
    expect(getBearerTokenFromAuthorizationHeader(null)).toBeNull();
    expect(getBearerTokenFromAuthorizationHeader('Basic xyz')).toBeNull();
    expect(getBearerTokenFromAuthorizationHeader('Bearer ')).toBeNull();
  });
});

describe('getBearerTokenFromRequest', () => {
  it('reads Authorization header from Request', () => {
    const request = new Request('https://api.example/v1/stories', {
      headers: { Authorization: 'Bearer token123' },
    });
    expect(getBearerTokenFromRequest(request)).toBe('token123');
  });
});

describe('createUserScopedClient', () => {
  it('throws when Supabase env is missing', () => {
    expect(() =>
      createUserScopedClient('token', {}),
    ).toThrow('Missing required environment variable');
  });

  it('creates client when env is present', () => {
    const client = createUserScopedClient('token', {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    });
    expect(client).toBeDefined();
  });
});

describe('verifyBearerAuth', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
  });

  it('returns 401 when token missing', async () => {
    const request = new Request('https://api.example/v1/stories');
    const result = await verifyBearerAuth(request, {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    });
    expect(result).toEqual({ status: 401, message: 'Missing Authorization Bearer token' });
  });

  it('returns user when token valid', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    });
    const request = new Request('https://api.example/v1/stories', {
      headers: { Authorization: 'Bearer valid-token' },
    });
    const result = await verifyBearerAuth(request, {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    });
    expect('user' in result && result.user.id).toBe('user-1');
  });

  it('returns 401 when Supabase rejects token', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid JWT' },
    });
    const request = new Request('https://api.example/v1/stories', {
      headers: { Authorization: 'Bearer bad-token' },
    });
    const result = await verifyBearerAuth(request, {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    });
    expect(result).toEqual({ status: 401, message: 'Invalid JWT' });
  });
});

describe('jsonAuthError', () => {
  it('returns JSON 401 with WWW-Authenticate', async () => {
    const response = jsonAuthError({ status: 401, message: 'Invalid token' });
    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toContain('Bearer');
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe('Invalid token');
  });
});
