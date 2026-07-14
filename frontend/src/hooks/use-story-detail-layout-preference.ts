'use client';

import * as React from 'react';
import {
  readStoryDetailLayoutPreference,
  writeStoryDetailLayoutPreference,
  type StoryDetailLayoutMode,
} from '@/lib/story-detail-layout-preference';

export interface UseStoryDetailLayoutPreferenceResult {
  layout: StoryDetailLayoutMode;
  setLayout: (mode: StoryDetailLayoutMode) => void;
  isSidebar: boolean;
  isModal: boolean;
}

/** Reads/writes `landi-flow:story-detail-layout` from localStorage (CR-09r-006). */
export function useStoryDetailLayoutPreference(): UseStoryDetailLayoutPreferenceResult {
  // Prefer stored preference on first client render to avoid a modal→sidebar flash
  // that unmounts StoryDetailSurface before the deep link can paint.
  const [layout, setLayoutState] = React.useState<StoryDetailLayoutMode>(() =>
    readStoryDetailLayoutPreference(),
  );

  React.useLayoutEffect(() => {
    const stored = readStoryDetailLayoutPreference();
    setLayoutState((current) => (current === stored ? current : stored));
  }, []);

  const setLayout = React.useCallback((mode: StoryDetailLayoutMode): void => {
    writeStoryDetailLayoutPreference(mode);
    setLayoutState(mode);
  }, []);

  return {
    layout,
    setLayout,
    isSidebar: layout === 'sidebar',
    isModal: layout === 'modal',
  };
}
