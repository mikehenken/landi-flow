'use client';

import * as React from 'react';
import { cn } from '@landi-flow/ui';

/**
 * Lightweight session bootstrap hint. Does not blank the app tree —
 * shell routes can paint while Supabase session hydrates.
 */
export function WorkspaceBootstrapSkeleton({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <div
      data-testid="workspace-bootstrap-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center',
        className,
      )}
    >
      <div className="mt-2 rounded-md border border-border bg-surface-elevated/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur">
        Restoring session…
      </div>
    </div>
  );
}
