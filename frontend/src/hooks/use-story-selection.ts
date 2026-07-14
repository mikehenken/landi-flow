'use client';

import * as React from 'react';
import { storySelectionStore } from '@/stores/story-selection-store';

export interface UseStorySelectionResult {
  selectedIds: string[];
  lastSelectedId: string | null;
  isSelected: (storyId: string) => boolean;
  toggle: (storyId: string) => void;
  selectRange: (storyId: string, orderedStoryIds: readonly string[]) => void;
  selectAll: (storyIds: readonly string[]) => void;
  clear: () => void;
}

export function useStorySelection(): UseStorySelectionResult {
  const snapshot = React.useSyncExternalStore(
    (listener) => storySelectionStore.subscribe(listener),
    () => storySelectionStore.getServerSnapshot(),
    () => storySelectionStore.getServerSnapshot(),
  );

  return {
    selectedIds: snapshot.selectedIds,
    lastSelectedId: snapshot.lastSelectedId,
    isSelected: (storyId: string) => snapshot.selectedIds.includes(storyId),
    toggle: (storyId: string) => storySelectionStore.toggle(storyId),
    selectRange: (storyId: string, orderedStoryIds: readonly string[]) =>
      storySelectionStore.selectRange(storyId, orderedStoryIds),
    selectAll: (storyIds: readonly string[]) => storySelectionStore.selectAll(storyIds),
    clear: () => storySelectionStore.clear(),
  };
}
