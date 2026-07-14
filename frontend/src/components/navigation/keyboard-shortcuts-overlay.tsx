'use client';

import * as React from 'react';
import { cn } from '@landi-flow/ui';

const SHORTCUTS = [
  { keys: '⌘K', description: 'Command palette' },
  { keys: 'C', description: 'Create Story' },
  { keys: 'G I', description: 'Go to Inbox' },
  { keys: 'G S', description: 'Go to Stories' },
  { keys: 'G E', description: 'Go to Epics' },
  { keys: 'G A', description: 'Go to Agents' },
  { keys: '⌘B', description: 'Toggle list/board' },
  { keys: 'F', description: 'Open filters' },
  { keys: 'Shift+M', description: 'Assign milestone' },
  { keys: '?', description: 'Show this overlay' },
];

export interface KeyboardShortcutsOverlayProps {
  open: boolean;
  onClose: () => void;
}

/** CAP-040: keyboard discoverability overlay (? key). */
export function KeyboardShortcutsOverlay({
  open,
  onClose,
}: KeyboardShortcutsOverlayProps): React.ReactElement | null {
  React.useEffect(() => {
    if (!open) {
      return;
    }
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      data-testid="keyboard-shortcuts-overlay"
      data-cap="CAP-040"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div
        className={cn(
          'max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-border',
          'bg-surface-overlay p-6 shadow-xl',
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Keyboard shortcuts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Press G then a letter to navigate. Pause after G to see sidebar hints.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {SHORTCUTS.map((row) => (
            <li key={row.keys} className="flex items-center justify-between gap-4 text-sm">
              <span>{row.description}</span>
              <kbd className="rounded bg-black/20 px-2 py-0.5 font-mono text-xs">{row.keys}</kbd>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-6 text-sm text-primary hover:underline"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
