'use client';

import { useSyncExternalStore } from 'react';
import { getStoryStore, subscribeStoryStore } from '@/stores/story-store';

/**
 * Primitive selector so list/detail re-render when selection changes.
 *
 * Uses {@link subscribeStoryStore} so OpenNext chunk duplicates cannot leave
 * the detail host stuck on `selectedStoryId: null` while
 * `globalThis.__landiFlowStoryStore` already holds the selection (GATE 2).
 */
export function useSelectedStoryId(): string | null {
  return useSyncExternalStore(
    subscribeStoryStore,
    () => getStoryStore().getServerSnapshot().selectedStoryId,
    () => getStoryStore().getServerSnapshot().selectedStoryId,
  );
}
