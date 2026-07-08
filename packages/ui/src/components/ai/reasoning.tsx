'use client';

import * as React from 'react';
import { Brain, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Response } from './response';

export interface ReasoningProps {
  text: string;
  isStreaming?: boolean;
  durationMs?: number | null;
  /** Auto-expand while streaming, auto-collapse when done (default true). */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Collapsible chain-of-thought panel (AI Elements `Reasoning`). Streams open
 * while the model is thinking, then reports elapsed duration and collapses.
 */
export function Reasoning({
  text,
  isStreaming = false,
  durationMs,
  defaultOpen,
  className,
}: ReasoningProps): React.ReactElement {
  const [open, setOpen] = React.useState(defaultOpen ?? isStreaming);
  const wasStreaming = React.useRef(isStreaming);

  React.useEffect(() => {
    // Auto-collapse the moment streaming finishes (unless the user opened it).
    if (wasStreaming.current && !isStreaming && defaultOpen === undefined) {
      setOpen(false);
    }
    wasStreaming.current = isStreaming;
  }, [isStreaming, defaultOpen]);

  const seconds = typeof durationMs === 'number' ? Math.max(1, Math.round(durationMs / 1000)) : null;

  return (
    <div className={cn('rounded-md border border-border bg-surface/60', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <Brain className={cn('h-3.5 w-3.5', isStreaming && 'animate-agent-pulse text-primary')} />
        <span className="font-medium">
          {isStreaming ? 'Thinking…' : seconds ? `Thought for ${seconds}s` : 'Reasoning'}
        </span>
        <ChevronRight
          className={cn('ml-auto h-3.5 w-3.5 transition-transform', open && 'rotate-90')}
        />
      </button>
      {open ? (
        <div className="border-t border-border px-3 py-2 text-muted-foreground">
          <Response className="text-xs [&_*]:text-muted-foreground">{text}</Response>
        </div>
      ) : null}
    </div>
  );
}
