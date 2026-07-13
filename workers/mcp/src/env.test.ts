import { describe, expect, it } from 'vitest';
import { resolveOAuthConsentPageUrl } from './env.js';

describe('resolveOAuthConsentPageUrl', () => {
  it('returns null when base URL is unset', () => {
    expect(resolveOAuthConsentPageUrl({} as never)).toBeNull();
  });

  it('builds locale-prefixed consent path', () => {
    expect(
      resolveOAuthConsentPageUrl({
        MCP_OAUTH_CONSENT_BASE_URL: 'https://flow.landi.build',
      } as never),
    ).toBe('https://flow.landi.build/en/oauth/mcp/consent');
  });

  it('strips trailing slash from base', () => {
    expect(
      resolveOAuthConsentPageUrl({
        MCP_OAUTH_CONSENT_BASE_URL: 'http://localhost:3000/',
      } as never),
    ).toBe('http://localhost:3000/en/oauth/mcp/consent');
  });
});
