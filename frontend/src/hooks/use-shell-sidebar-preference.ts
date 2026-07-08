'use client';

import * as React from 'react';
import {
  readShellSidebarCollapsedPreference,
  writeShellSidebarCollapsedPreference,
} from '@/lib/shell-sidebar-preference';

export interface UseShellSidebarPreferenceResult {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
}

/** Reads/writes `landi-flow:shell-sidebar-collapsed` from localStorage (task-09t). */
export function useShellSidebarPreference(): UseShellSidebarPreferenceResult {
  const [collapsed, setCollapsedState] = React.useState<boolean>(() =>
    readShellSidebarCollapsedPreference(),
  );

  const setCollapsed = React.useCallback((next: boolean): void => {
    writeShellSidebarCollapsedPreference(next);
    setCollapsedState(next);
  }, []);

  const toggleCollapsed = React.useCallback((): void => {
    setCollapsedState((prev) => {
      const next = !prev;
      writeShellSidebarCollapsedPreference(next);
      return next;
    });
  }, []);

  return {
    collapsed,
    setCollapsed,
    toggleCollapsed,
  };
}
