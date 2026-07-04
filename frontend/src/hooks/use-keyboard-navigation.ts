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
  awaitingGSecondary: boolean;
}

const G_SECONDARY_KEYS = new Set(['i', 's', 'e']);

/**
 * Global keyboard shortcuts per shared-design-system.
 * Cmd/Ctrl+K palette, Cmd/Ctrl+\ sidebar, Cmd/Ctrl+. inspector, C create, G then I/S/E nav.
 */
export function useKeyboardNavigation(options: KeyboardNavigationOptions): void {
  const optionsRef = React.useRef(options);
  optionsRef.current = options;

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true;

      if (event.key === 'Escape') {
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

      if (optionsRef.current.awaitingGSecondary) {
        const secondaryKey = event.key.toLowerCase();
        if (G_SECONDARY_KEYS.has(secondaryKey)) {
          event.preventDefault();
          optionsRef.current.onGSecondary(secondaryKey);
        } else {
          optionsRef.current.onCancelGSecondary();
        }
        return;
      }

      if (event.key.toLowerCase() === 'g' && !mod) {
        optionsRef.current.onGKey();
        return;
      }

      if (event.key.toLowerCase() === 'c' && !mod) {
        optionsRef.current.onCreateStory();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
