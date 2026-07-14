import { describe, expect, it } from 'vitest';
import {
  STORY_STORE_CHANGE_EVENT,
  storyStore,
  subscribeStoryStore,
} from '@/stores/story-store';

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

  it('window change event fires so orphaned hook subscribers can rebind', () => {
    let eventCount = 0;
    const onChange = (): void => {
      eventCount += 1;
    };
    window.addEventListener(STORY_STORE_CHANGE_EVENT, onChange);
    storyStore.openStoryDetail('story-probe-3');
    window.removeEventListener(STORY_STORE_CHANGE_EVENT, onChange);
    expect(eventCount).toBeGreaterThan(0);
    storyStore.selectStory(null);
  });

  it('subscribeStoryStore re-notifies via window event after openStoryDetail', () => {
    let callCount = 0;
    const unsubscribe = subscribeStoryStore(() => {
      callCount += 1;
    });
    const baseline = callCount;
    storyStore.openStoryDetail('story-probe-4');
    expect(callCount).toBeGreaterThan(baseline);
    expect(storyStore.getServerSnapshot().selectedStoryId).toBe('story-probe-4');
    storyStore.selectStory(null);
    unsubscribe();
  });
});
