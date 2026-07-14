'use client';

import { useSyncExternalStore } from 'react';
import { getStoryStore, type StoryStoreState } from '@/stores/story-store';

export function useStoryStore(): StoryStoreState {
  return useSyncExternalStore(
    (listener) => getStoryStore().subscribe(listener),
    () => getStoryStore().getServerSnapshot(),
    () => getStoryStore().getServerSnapshot(),
  );
}
