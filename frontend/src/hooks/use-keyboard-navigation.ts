'use client';

import * as React from 'react';

export interface KeyboardNavigationOptions {
  onCommandPalette: () => void;
  onToggleSidebar: () => void;
  onToggleInspector: () => void;
  onCreateStory: () => void;
  onEscape: () => void;
  onGKey: () => void;
  onGSecondary: (key: string) => void;
  onCancelGSecondary: () => void;
  onShowShortcuts?: () => void;
  awaitingGSecondary: boolean;
}

const G_SECONDARY_KEYS = new Set(['i', 's', 'e', 'a']);

/**
 * Global keyboard shortcuts per shared-design-system.
 * Cmd/Ctrl+K palette, Cmd/Ctrl+\ sidebar, Cmd/Ctrl+. inspector, C create, G then I/S/E nav.
 */
export function useKeyboardNavigation(options: KeyboardNavigationOptions): void {
  const optionsRef = React.useRef(options);
  optionsRef.current = options;
  /** Sync ref so G→secondary works before React re-renders after G. */
  const awaitingGSecondaryRef = React.useRef(false);

  React.useEffect(() => {
    awaitingGSecondaryRef.current = options.awaitingGSecondary;
  }, [options.awaitingGSecondary]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? '';
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable === true;

      if (event.key === 'Escape') {
        awaitingGSecondaryRef.current = false;
        optionsRef.current.onEscape();
        return;
      }

      if (isEditable) return;

      const mod = event.metaKey || event.ctrlKey;

      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        optionsRef.current.onCommandPalette();
        return;
      }

      if (mod && event.key === '\\') {
        event.preventDefault();
        optionsRef.current.onToggleSidebar();
        return;
      }

      if (mod && event.key === '.') {
        event.preventDefault();
        optionsRef.current.onToggleInspector();
        return;
      }

      if (awaitingGSecondaryRef.current) {
        const secondaryKey = event.key.toLowerCase();
        if (G_SECONDARY_KEYS.has(secondaryKey)) {
          event.preventDefault();
          awaitingGSecondaryRef.current = false;
          optionsRef.current.onGSecondary(secondaryKey);
        } else {
          awaitingGSecondaryRef.current = false;
          optionsRef.current.onCancelGSecondary();
        }
        return;
      }

      if (event.key.toLowerCase() === 'g' && !mod) {
        event.preventDefault();
        awaitingGSecondaryRef.current = true;
        optionsRef.current.onGKey();
        return;
      }

      if (event.key.toLowerCase() === 'c' && !mod) {
        event.preventDefault();
        optionsRef.current.onCreateStory();
        return;
      }

      if (event.key === '?' && !mod) {
        event.preventDefault();
        optionsRef.current.onShowShortcuts?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
