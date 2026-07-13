import { describe, expect, it } from 'vitest';
import {
  buildMcpConsentReturnPath,
  buildOAuthAccessDeniedRedirect,
  describeMcpOAuthScopes,
  parseMcpOAuthParams,
  serializeMcpOAuthParams,
} from './mcp-consent';

describe('parseMcpOAuthParams', () => {
  it('accepts valid authorization code + PKCE params', () => {
    const result = parseMcpOAuthParams({
      response_type: 'code',
      client_id: 'lcf_client_abc',
      code_challenge: 'challenge',
      redirect_uri: 'cursor://callback',
      state: 'state-1',
      scope: 'read write',
      resource: 'http://127.0.0.1:8787/mcp',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.params.client_id).toBe('lcf_client_abc');
      expect(result.params.code_challenge_method).toBe('S256');
    }
  });

  it('rejects missing client_id', () => {
    const result = parseMcpOAuthParams({
      response_type: 'code',
      code_challenge: 'challenge',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects unsupported response_type', () => {
    const result = parseMcpOAuthParams({
      response_type: 'token',
      client_id: 'x',
      code_challenge: 'y',
    });
    expect(result.ok).toBe(false);
  });
});

describe('serializeMcpOAuthParams', () => {
  it('includes workspace_id when provided', () => {
    const query = serializeMcpOAuthParams(
      {
        response_type: 'code',
        client_id: 'c1',
        redirect_uri: 'http://localhost/cb',
        code_challenge: 'pkce',
        code_challenge_method: 'S256',
        state: 's1',
        scope: 'read',
        resource: null,
      },
      'workspace-uuid',
    );
    expect(query).toContain('workspace_id=workspace-uuid');
    expect(query).toContain('client_id=c1');
  });
});

describe('buildMcpConsentReturnPath', () => {
  it('builds locale-free path for login redirect', () => {
    const path = buildMcpConsentReturnPath({
      response_type: 'code',
      client_id: 'c1',
      redirect_uri: null,
      code_challenge: 'pkce',
      code_challenge_method: 'S256',
      state: null,
      scope: null,
      resource: null,
    });
    expect(path.startsWith('/oauth/mcp/consent?')).toBe(true);
  });
});

describe('describeMcpOAuthScopes', () => {
  it('returns default when scope is empty', () => {
    expect(describeMcpOAuthScopes(null)).toEqual(['Read workspace data (default)']);
  });

  it('maps known scopes to labels', () => {
    const lines = describeMcpOAuthScopes('read stories:write');
    expect(lines).toContain('Read workspace data');
    expect(lines).toContain('Update stories');
  });
});

describe('buildOAuthAccessDeniedRedirect', () => {
  it('appends OAuth error params', () => {
    const url = buildOAuthAccessDeniedRedirect('http://127.0.0.1:3333/callback', 'state-99');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('error')).toBe('access_denied');
    expect(parsed.searchParams.get('state')).toBe('state-99');
  });
});
