import { describe, expect, it } from 'vitest';
import { storyStore } from '@/stores/story-store';

describe('useSelectedStoryId store contract', () => {
  it('exposes selectedStoryId via getServerSnapshot after openStoryDetail', () => {
    const before = storyStore.getServerSnapshot().selectedStoryId;
    storyStore.openStoryDetail('story-probe-1');
    expect(storyStore.getServerSnapshot().selectedStoryId).toBe('story-probe-1');
    storyStore.selectStory(before);
  });

  it('notifies subscribe listeners when selection changes', () => {
    let callCount = 0;
    const unsubscribe = storyStore.subscribe(() => {
      callCount += 1;
    });
    const initialCalls = callCount;
    storyStore.openStoryDetail('story-probe-2');
    expect(callCount).toBeGreaterThan(initialCalls);
    storyStore.selectStory(null);
    unsubscribe();
  });
});
