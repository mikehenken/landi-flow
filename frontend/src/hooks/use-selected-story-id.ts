'use client';

import {
  readGlobalStorySnapshot,
  useCanonicalStoryStore,
} from '@/hooks/use-canonical-story-store';

/**
 * Primitive selector so list/detail re-render when selection changes.
 *
 * Prefers live `globalThis.__landiFlowStoryStore` over hook snap — fbe3091 left
 * hook `selectedStoryId: null` while global already held GEN-* (GATE 2 P0-1).
 */
export function useSelectedStoryId(): string | null {
  const { snap } = useCanonicalStoryStore();
  return readGlobalStorySnapshot().selectedStoryId ?? snap.selectedStoryId;
}
