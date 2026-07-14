'use client';

import * as React from 'react';
import { useStorySelection } from '@/hooks/use-story-selection';
import { storySelectionStore } from '@/stores/story-selection-store';

export interface UseStoriesViewShortcutsOptions {
  enabled: boolean;
  orderedStoryIds: readonly string[];
  onToggleLayout: () => void;
  onOpenFilter: () => void;
  onOpenDisplay: () => void;
  focusedStoryId?: string | null;
}

/** Stories view keyboard shortcuts: Cmd+B, F, Shift+V, X, Cmd+A (CAP-022, CAP-027). */
export function useStoriesViewShortcuts(options: UseStoriesViewShortcutsOptions): void {
  const optionsRef = React.useRef(options);
  optionsRef.current = options;
  const { toggle, selectRange } = useStorySelection();

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!optionsRef.current.enabled) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? '';
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable === true;

      const mod = event.metaKey || event.ctrlKey;

      if (mod && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        optionsRef.current.onToggleLayout();
        return;
      }

      if (mod && event.key.toLowerCase() === 'a' && !isEditable) {
        event.preventDefault();
        storySelectionStore.selectAll(optionsRef.current.orderedStoryIds);
        return;
      }

      if (isEditable) {
        return;
      }

      if (event.key.toLowerCase() === 'f' && !mod) {
        event.preventDefault();
        optionsRef.current.onOpenFilter();
        return;
      }

      if (event.shiftKey && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        optionsRef.current.onOpenDisplay();
        return;
      }

      if (event.key.toLowerCase() === 'x' && !mod) {
        const focusedId = optionsRef.current.focusedStoryId;
        if (!focusedId) {
          return;
        }
        event.preventDefault();
        if (event.shiftKey) {
          selectRange(focusedId, optionsRef.current.orderedStoryIds);
        } else {
          toggle(focusedId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle, selectRange]);
}
