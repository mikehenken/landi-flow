'use client';

import { useSyncExternalStore } from 'react';
import { storyStore, type StoryStoreState } from '@/stores/story-store';

export function useStoryStore(): StoryStoreState {
  return useSyncExternalStore(
    (listener) => storyStore.subscribe(listener),
    () => storyStore.getServerSnapshot(),
    () => storyStore.getServerSnapshot(),
  );
}
