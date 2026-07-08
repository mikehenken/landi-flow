import { describe, expect, it } from 'vitest';
import { storyStore } from '@/stores/story-store';

describe('BaseDomainStore server snapshot caching', () => {
  it('returns a stable getServerSnapshot reference until notify', () => {
    const first = storyStore.getServerSnapshot();
    const second = storyStore.getServerSnapshot();
    expect(first).toBe(second);
  });
});
