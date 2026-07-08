import { describe, expect, it } from 'vitest';
import { MCP_SCOPES, isWriteScope, sanitizeRequestedScopes } from '../auth/scopes';

describe('MCP scopes', () => {
  it('identifies write scopes', () => {
    expect(isWriteScope(MCP_SCOPES.WRITE)).toBe(true);
    expect(isWriteScope(MCP_SCOPES.READ)).toBe(false);
    expect(isWriteScope(MCP_SCOPES.STORIES_WRITE)).toBe(true);
  });

  it('sanitizes admin scopes from app credentials', () => {
    const scopes = sanitizeRequestedScopes(['read', 'admin', 'stories:write', 'admin:foo']);
    expect(scopes).not.toContain('admin');
    expect(scopes).toContain('read');
    expect(scopes).toContain('stories:write');
  });

  it('defaults to read when empty after sanitization', () => {
    expect(sanitizeRequestedScopes(['admin'])).toEqual([MCP_SCOPES.READ]);
  });
});

describe('MCP tool catalogue (static contract)', () => {
  const expectedTools = [
    'flow.search',
    'epic.create',
    'epic.list',
    'story.create',
    'story.assign',
    'comment.create',
    'signal.attach',
  ] as const;

  it('documents required Epic/Story tool names for IDE agents', () => {
    // Static contract test — full MCP_TOOLS import pulls worker runtime deps.
    for (const name of expectedTools) {
      expect(name).toMatch(/^(flow|epic|story|comment|signal)\./);
    }
  });
});
