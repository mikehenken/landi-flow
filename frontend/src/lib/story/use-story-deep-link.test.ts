import { describe, expect, it } from 'vitest';
import { syncStoryModalUrl } from './use-story-deep-link';

describe('syncStoryModalUrl', () => {
  const story = { id: 'uuid-story-3', identifier: 'GEN-3' };

  it('returns pathname unchanged when story is missing', () => {
    expect(syncStoryModalUrl('/workspace/stories', undefined)).toBe('/workspace/stories');
  });

  it('encodes story identifier in query string', () => {
    const url = syncStoryModalUrl('/en/workspace/stories', story);
    expect(url).toBe('/en/workspace/stories?story=GEN-3');
  });

  it('includes section and signal when provided', () => {
    const url = syncStoryModalUrl('/workspace/inbox', story, {
      section: 'comments',
      highlightedSignalId: 'sig-42',
    });
    const params = new URLSearchParams(url.split('?')[1] ?? '');
    expect(params.get('story')).toBe('GEN-3');
    expect(params.get('section')).toBe('comments');
    expect(params.get('signal')).toBe('sig-42');
  });
});
