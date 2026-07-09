'use client';

import * as React from 'react';
import { Button, cn } from '@landi-flow/ui';
import { PanelRightClose } from 'lucide-react';

export interface InspectorPaneShellProps {
  /** Panel title when the child does not render its own header. */
  title?: string;
  onHide: () => void;
  onClose?: () => void;
  /** Child already renders a title row (e.g. agent roster). */
  embeddedHeader?: boolean;
  children: React.ReactNode;
}

/** Right sidebar chrome — hide toggle in the top-right header row. */
export function InspectorPaneShell({
  title,
  onHide,
  onClose,
  embeddedHeader = false,
  children,
}: InspectorPaneShellProps): React.ReactElement {
  const hideToggle = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onHide}
      aria-label="Hide properties panel"
      data-testid="inspector-hide-toggle"
      className="h-7 w-7 shrink-0 p-0"
    >
      <PanelRightClose className="h-4 w-4" aria-hidden />
    </Button>
  );

  if (embeddedHeader) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-end border-b border-border px-2 py-1">
          {hideToggle}
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div
        className={cn(
          'flex shrink-0 items-center justify-between border-b border-border px-4 py-3',
        )}
      >
        <h2 className="text-sm font-medium text-foreground">{title ?? 'Properties'}</h2>
        <div className="flex items-center gap-0.5">
          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close inspector"
              data-testid="inspector-close-button"
              className="h-7 w-7 shrink-0 p-0"
            >
              <span aria-hidden>✕</span>
            </Button>
          ) : null}
          {hideToggle}
        </div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
