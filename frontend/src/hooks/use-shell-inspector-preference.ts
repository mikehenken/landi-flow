'use client';

import * as React from 'react';
import {
  readShellInspectorOpenPreference,
  writeShellInspectorOpenPreference,
} from '@/lib/shell-inspector-preference';

export interface UseShellInspectorPreferenceResult {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
}

/** Reads/writes `landi-flow:shell-inspector-open` from localStorage. */
export function useShellInspectorPreference(): UseShellInspectorPreferenceResult {
  const [open, setOpenState] = React.useState<boolean>(() => readShellInspectorOpenPreference());

  const setOpen = React.useCallback((next: boolean): void => {
    writeShellInspectorOpenPreference(next);
    setOpenState(next);
  }, []);

  const toggleOpen = React.useCallback((): void => {
    setOpenState((prev) => {
      const next = !prev;
      writeShellInspectorOpenPreference(next);
      return next;
    });
  }, []);

  return {
    open,
    setOpen,
    toggleOpen,
  };
}
