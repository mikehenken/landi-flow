import { describe, expect, it } from 'vitest';
import {
  buildConsentRedirectResponse,
  shouldRedirectToOAuthConsent,
} from './oauth-consent.js';

describe('shouldRedirectToOAuthConsent', () => {
  it('returns false when consent URL is unset', () => {
    expect(
      shouldRedirectToOAuthConsent({
        bearerPresent: false,
        workspaceId: null,
        consentPageUrl: null,
      }),
    ).toBe(false);
  });

  it('redirects when bearer is missing', () => {
    expect(
      shouldRedirectToOAuthConsent({
        bearerPresent: false,
        workspaceId: 'ws-1',
        consentPageUrl: 'http://localhost:3000/en/oauth/mcp/consent',
      }),
    ).toBe(true);
  });

  it('redirects when workspace_id is missing', () => {
    expect(
      shouldRedirectToOAuthConsent({
        bearerPresent: true,
        workspaceId: null,
        consentPageUrl: 'http://localhost:3000/en/oauth/mcp/consent',
      }),
    ).toBe(true);
  });

  it('does not redirect when bearer and workspace are present', () => {
    expect(
      shouldRedirectToOAuthConsent({
        bearerPresent: true,
        workspaceId: 'ws-1',
        consentPageUrl: 'http://localhost:3000/en/oauth/mcp/consent',
      }),
    ).toBe(false);
  });
});

describe('buildConsentRedirectResponse', () => {
  it('preserves OAuth query params on redirect', () => {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: 'lcf_client_test',
      code_challenge: 'abc',
      state: 'xyz',
    });
    const response = buildConsentRedirectResponse(
      'http://localhost:3000/en/oauth/mcp/consent',
      params,
    );
    expect(response.status).toBe(302);
    const location = response.headers.get('Location');
    expect(location).toContain('/en/oauth/mcp/consent');
    expect(location).toContain('client_id=lcf_client_test');
    expect(location).toContain('code_challenge=abc');
    expect(location).toContain('state=xyz');
  });
});
