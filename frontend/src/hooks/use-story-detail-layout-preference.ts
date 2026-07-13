'use client';

import * as React from 'react';
import {
  DEFAULT_STORY_DETAIL_LAYOUT,
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
  // SSR defaults to modal; sync real preference before paint so sidebar users see detail.
  const [layout, setLayoutState] = React.useState<StoryDetailLayoutMode>(
    DEFAULT_STORY_DETAIL_LAYOUT,
  );

  React.useLayoutEffect(() => {
    setLayoutState(readStoryDetailLayoutPreference());
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
