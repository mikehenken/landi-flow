'use client';

import { useSyncExternalStore } from 'react';
import { getStoryStore } from '@/stores/story-store';

/** Primitive selector so list/detail re-render when selection changes. */
export function useSelectedStoryId(): string | null {
  return useSyncExternalStore(
    (onStoreChange) => getStoryStore().subscribe(onStoreChange),
    () => getStoryStore().getServerSnapshot().selectedStoryId,
    () => getStoryStore().getServerSnapshot().selectedStoryId,
  );
}
