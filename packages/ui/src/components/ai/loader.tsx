'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LoaderProps {
  label?: string;
  className?: string;
}

/** Streaming indicator (AI Elements `Loader`) — three-dot typing animation. */
export function Loader({ label, className }: LoaderProps): React.ReactElement {
  return (
    <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
      <span className="flex items-center gap-1" aria-hidden>
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
      </span>
      {label ? <span>{label}</span> : null}
      <span className="sr-only">{label ?? 'Generating response'}</span>
    </div>
  );
}

function Dot({ delay }: { delay: string }): React.ReactElement {
  return (
    <span
      className="h-1.5 w-1.5 animate-agent-pulse rounded-full bg-foreground-subtle"
      style={{ animationDelay: delay }}
    />
  );
}
