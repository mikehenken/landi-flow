'use client';

import { useSyncExternalStore } from 'react';
import { storyStore } from '@/stores/story-store';

/** Primitive selector so list/detail re-render when selection changes. */
export function useSelectedStoryId(): string | null {
  return useSyncExternalStore(
    (onStoreChange) => storyStore.subscribe(onStoreChange),
    () => storyStore.getServerSnapshot().selectedStoryId,
    () => storyStore.getServerSnapshot().selectedStoryId,
  );
}
