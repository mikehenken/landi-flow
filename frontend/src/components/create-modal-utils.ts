'use client';

import * as React from 'react';

/** Trap Tab focus within a modal panel (CAP-004 accessibility). */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') {
    return;
  }

  const focusable = container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  if (focusable.length === 0) {
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) {
    return;
  }

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export interface UseCap004DialogOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

/** Sync native `<dialog>` open state, focus, and focus trap for CAP-004 modals. */
export function useCap004Dialog({
  open,
  onOpenChange,
  panelRef,
  initialFocusRef,
}: UseCap004DialogOptions): React.RefObject<HTMLDialogElement | null> {
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
      requestAnimationFrame(() => initialFocusRef?.current?.focus());
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [open, initialFocusRef]);

  React.useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      trapFocus(panel, event);
    };

    panel.addEventListener('keydown', onKeyDown);
    return () => panel.removeEventListener('keydown', onKeyDown);
  }, [open, panelRef]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  return dialogRef;
}
