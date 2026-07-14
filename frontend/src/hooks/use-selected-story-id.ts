'use client';

import { useCanonicalStoryStore } from '@/hooks/use-canonical-story-store';

/**
 * Primitive selector so list/detail re-render when selection changes.
 *
 * Reads `globalThis.__landiFlowStoryStore` via {@link useCanonicalStoryStore}
 * (event + poll) — useSyncExternalStore alone left the detail host stuck on
 * `selectedStoryId: null` in OpenNext production (GATE 2 P0-1).
 */
export function useSelectedStoryId(): string | null {
  return useCanonicalStoryStore().snap.selectedStoryId;
}
