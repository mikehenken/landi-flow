'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/** Row of per-response actions (AI Elements `Actions`) — copy, retry, branch, … */
export function Actions({
  children,
  className,
  ...props
}: ActionsProps): React.ReactElement {
  return (
    <div className={cn('flex items-center gap-0.5', className)} {...props}>
      {children}
    </div>
  );
}

export interface ActionProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: React.ReactNode;
}

export function Action({
  label,
  icon,
  className,
  ...props
}: ActionProps): React.ReactElement {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded text-foreground-subtle',
        'transition-colors hover:bg-white/5 hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
