'use client';

import * as React from 'react';
import type {
  StoryDisplayOptions,
  StoryFilterAst,
  StoryViewPreferences,
} from '@landi-flow/core/types';
import { DEFAULT_STORY_VIEW_PREFERENCES } from '@landi-flow/core/types';
import {
  readStoryViewPreferences,
  writeStoryViewPreferences,
} from '@/lib/story-view-preferences';

export interface UseStoryViewPreferencesResult {
  preferences: StoryViewPreferences;
  setFilters: (filters: StoryFilterAst) => void;
  setDisplay: (display: StoryDisplayOptions) => void;
  patchDisplay: (patch: Partial<StoryDisplayOptions>) => void;
  setSearchQuery: (query: string) => void;
}

export function useStoryViewPreferences(): UseStoryViewPreferencesResult {
  const [preferences, setPreferences] = React.useState<StoryViewPreferences>(
    DEFAULT_STORY_VIEW_PREFERENCES,
  );

  React.useEffect(() => {
    setPreferences(readStoryViewPreferences());
  }, []);

  const persist = React.useCallback((updater: (current: StoryViewPreferences) => StoryViewPreferences): void => {
    setPreferences((current) => {
      const next = updater(current);
      writeStoryViewPreferences(next);
      return next;
    });
  }, []);

  const setFilters = React.useCallback(
    (filters: StoryFilterAst): void => {
      persist((current) => ({ ...current, filters }));
    },
    [persist],
  );

  const setDisplay = React.useCallback(
    (display: StoryDisplayOptions): void => {
      persist((current) => ({ ...current, display }));
    },
    [persist],
  );

  const patchDisplay = React.useCallback(
    (patch: Partial<StoryDisplayOptions>): void => {
      persist((current) => ({
        ...current,
        display: { ...current.display, ...patch },
      }));
    },
    [persist],
  );

  const setSearchQuery = React.useCallback(
    (searchQuery: string): void => {
      persist((current) => ({ ...current, searchQuery }));
    },
    [persist],
  );

  return {
    preferences,
    setFilters,
    setDisplay,
    patchDisplay,
    setSearchQuery,
  };
}
