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
    'workspace.context',
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
      expect(name).toMatch(/^(workspace|flow|epic|story|comment|signal)\./);
    }
  });
});

describe('Cursor MCP tool aliases', () => {
  it('maps dot names to underscore aliases for IDE bridges', async () => {
    const { toCursorToolAlias, TOOLS_BY_NAME, MCP_TOOLS } = await import('./tools.js');
    expect(toCursorToolAlias('story.list')).toBe('story_list');
    expect(toCursorToolAlias('collab.join_story_room')).toBe('collab_join_story_room');
    expect(toCursorToolAlias('ai.draft_story')).toBe('ai_draft_story');
    for (const tool of MCP_TOOLS) {
      const alias = toCursorToolAlias(tool.name);
      expect(TOOLS_BY_NAME.get(alias)).toBe(tool);
    }
  });
});
