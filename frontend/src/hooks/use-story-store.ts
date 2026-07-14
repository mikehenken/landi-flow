'use client';

import { useSyncExternalStore } from 'react';
import {
  getStoryStore,
  subscribeStoryStore,
  type StoryStoreState,
} from '@/stores/story-store';

/** Full story domain snapshot — same canonical subscribe bridge as selection. */
export function useStoryStore(): StoryStoreState {
  return useSyncExternalStore(
    subscribeStoryStore,
    () => getStoryStore().getServerSnapshot(),
    () => getStoryStore().getServerSnapshot(),
  );
}
