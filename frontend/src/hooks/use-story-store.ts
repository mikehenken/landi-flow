'use client';

import { useCanonicalStoryStore } from '@/hooks/use-canonical-story-store';
import type { StoryStoreState } from '@/stores/story-store';

/**
 * Full story domain snapshot — follows `globalThis.__landiFlowStoryStore` only
 * (same path as StoryDetailModalHost) so OpenNext chunk orphans cannot desync.
 */
export function useStoryStore(): StoryStoreState {
  return useCanonicalStoryStore().snap;
}
