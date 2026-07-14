import { describe, expect, it } from 'vitest';
import { replaceStoryQueryInHistory, syncStoryModalUrl } from './use-story-deep-link';

const story = { id: 'uuid-story-3', identifier: 'GEN-3' };

describe('syncStoryModalUrl', () => {
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

describe('replaceStoryQueryInHistory', () => {
  it('no-ops when window is unavailable (SSR)', () => {
    expect(() => replaceStoryQueryInHistory(story)).not.toThrow();
  });

  it('sets story query when history API is present', () => {
    const hrefs: string[] = [];
    const fakeWindow = {
      location: {
        href: 'https://flow.landi.build/en/workspace/stories',
        pathname: '/en/workspace/stories',
        search: '',
      },
      history: {
        state: null,
        replaceState: (_state: unknown, _title: string, url: string) => {
          hrefs.push(url);
          const [path, search = ''] = url.split('?');
          fakeWindow.location.pathname = path ?? '/en/workspace/stories';
          fakeWindow.location.search = search ? `?${search}` : '';
        },
      },
    };
    const previous = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: fakeWindow,
    });
    try {
      replaceStoryQueryInHistory(story);
      expect(hrefs[0]).toContain('story=GEN-3');
      expect(new URLSearchParams(fakeWindow.location.search).get('story')).toBe('GEN-3');
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        writable: true,
        value: previous,
      });
    }
  });
});
