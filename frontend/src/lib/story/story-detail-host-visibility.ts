import type { Story } from '@landi-flow/core/types';
import type { StoryStoreState } from '@/stores/story-store';

export interface StoryDetailHostVisibility {
  selectedStoryId: string | null;
  showPortal: boolean;
  resolvedIdentifier: string | null;
  storeCount: number;
}

export function resolveStoryBySelection(
  stories: Story[],
  selectedId: string | null,
): Story | null {
  if (!selectedId) {
    return null;
  }
  return (
    stories.find(
      (story) => story.id === selectedId || story.identifier === selectedId,
    ) ?? null
  );
}

/**
 * Host visibility must follow the canonical global store snapshot only.
 * When `selectedStoryId` is set → `showPortal` is true (GATE 2 P0-1).
 */
export function deriveStoryDetailHostVisibility(
  globalSnap: StoryStoreState,
): StoryDetailHostVisibility {
  const selectedStoryId = globalSnap.selectedStoryId;
  const selectedStory = resolveStoryBySelection(globalSnap.stories, selectedStoryId);
  return {
    selectedStoryId,
    showPortal: selectedStoryId !== null,
    resolvedIdentifier: selectedStory?.identifier ?? null,
    storeCount: globalSnap.stories.length,
  };
}

export function writeStoryDetailDebugDataset(payload: Record<string, unknown>): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.dataset.storyDetailDebug = JSON.stringify(payload);
}
