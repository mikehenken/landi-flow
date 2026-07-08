'use client';

import * as React from 'react';
import { cn } from '@landi-flow/ui';
import {
  WORKSPACE_REGISTRY,
  type ResolvedWorkspace,
} from '@/lib/workspace/registry';

export interface WorkspaceSwitcherProps {
  activeWorkspace: ResolvedWorkspace;
  onSwitch: (workspace: ResolvedWorkspace) => void;
  className?: string;
}

/** CAP-037: workspace switcher from membership registry. */
export function WorkspaceSwitcher({
  activeWorkspace,
  onSwitch,
  className,
}: WorkspaceSwitcherProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn('relative', className)} data-testid="workspace-switcher" data-cap="CAP-037">
      <button
        type="button"
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium',
          'hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        )}
        data-testid="workspace-switcher-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">{activeWorkspace.name}</span>
        <span className="text-xs text-muted-foreground">▾</span>
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-md border border-border bg-surface-overlay py-1 shadow-lg"
          data-testid="workspace-switcher-menu"
        >
          {WORKSPACE_REGISTRY.map((ws) => (
            <li key={ws.id}>
              <button
                type="button"
                role="option"
                aria-selected={ws.id === activeWorkspace.id}
                className={cn(
                  'flex w-full items-center px-3 py-2 text-left text-sm hover:bg-white/5',
                  ws.id === activeWorkspace.id && 'bg-white/5 font-medium',
                )}
                data-testid={`workspace-option-${ws.slug}`}
                onClick={() => {
                  onSwitch(ws);
                  setOpen(false);
                }}
              >
                {ws.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
