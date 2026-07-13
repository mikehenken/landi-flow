import { describe, expect, it } from 'vitest';
import {
  isStoryModalRoute,
  pathMatchesRoute,
  preservesStorySelection,
} from './story-detail-routes';

describe('story-detail-routes', () => {
  it('matches localized and nested story paths', () => {
    expect(pathMatchesRoute('/workspace/stories', '/workspace/stories')).toBe(true);
    expect(pathMatchesRoute('/en/workspace/stories', '/workspace/stories')).toBe(true);
    expect(pathMatchesRoute('/workspace/stories/board', '/workspace/stories')).toBe(true);
  });

  it('allows modal on stories, board, inbox, and my-issues', () => {
    expect(isStoryModalRoute('/workspace/stories')).toBe(true);
    expect(isStoryModalRoute('/workspace/stories/board')).toBe(true);
    expect(isStoryModalRoute('/workspace/inbox')).toBe(true);
    expect(isStoryModalRoute('/workspace/my-issues')).toBe(true);
    expect(isStoryModalRoute('/workspace/settings')).toBe(false);
  });

  it('preserves selection on my-issues so detail can stay open', () => {
    expect(preservesStorySelection('/workspace/my-issues')).toBe(true);
    expect(preservesStorySelection('/en/workspace/my-issues')).toBe(true);
    expect(preservesStorySelection('/workspace/agents')).toBe(false);
  });
});
