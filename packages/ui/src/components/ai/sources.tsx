'use client';

import * as React from 'react';
import { BookText, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SourcePart } from './types';

export interface SourcesProps {
  sources: SourcePart[];
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Collapsible list of source citations (AI Elements `Sources`). Renders nothing
 * when the answer produced no `source` parts, so the trigger never shows a zero
 * count.
 */
export function Sources({
  sources,
  defaultOpen = false,
  className,
}: SourcesProps): React.ReactElement | null {
  const [open, setOpen] = React.useState(defaultOpen);
  if (sources.length === 0) {
    return null;
  }
  return (
    <div className={cn('rounded-md border border-border bg-surface/60', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <BookText className="h-3.5 w-3.5" />
        <span className="font-medium">
          {sources.length} source{sources.length === 1 ? '' : 's'}
        </span>
        <ChevronRight
          className={cn('ml-auto h-3.5 w-3.5 transition-transform', open && 'rotate-90')}
        />
      </button>
      {open ? (
        <ol className="space-y-1 border-t border-border px-3 py-2">
          {sources.map((source, index) => (
            <li key={source.id} className="flex gap-2 text-xs">
              <span className="font-mono text-foreground-subtle">[{index + 1}]</span>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group min-w-0 flex-1"
              >
                <span className="flex items-center gap-1 truncate font-medium text-foreground group-hover:text-primary">
                  {source.title ?? source.url}
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                </span>
                {source.snippet ? (
                  <span className="line-clamp-2 text-muted-foreground">{source.snippet}</span>
                ) : null}
              </a>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

export interface InlineCitationProps {
  index: number;
  source: SourcePart;
  className?: string;
}

/**
 * In-text citation marker (AI Elements `InlineCitation`) with a hover card
 * exposing the source title, URL, and snippet.
 */
export function InlineCitation({
  index,
  source,
  className,
}: InlineCitationProps): React.ReactElement {
  return (
    <span className={cn('group relative inline-block align-super', className)}>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-0.5 rounded-sm bg-primary/10 px-1 text-[10px] font-medium text-primary hover:bg-primary/20"
        aria-label={`Source ${index}: ${source.title ?? source.url}`}
      >
        {index}
      </a>
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden w-56 -translate-x-1/2',
          'rounded-md border border-border bg-surface-overlay p-2 text-left text-xs shadow-lg',
          'group-hover:block',
        )}
      >
        <span className="block truncate font-medium text-foreground">
          {source.title ?? source.url}
        </span>
        {source.snippet ? (
          <span className="mt-0.5 line-clamp-3 block text-muted-foreground">
            {source.snippet}
          </span>
        ) : null}
      </span>
    </span>
  );
}
