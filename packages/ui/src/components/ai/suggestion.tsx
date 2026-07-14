'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SuggestionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Suggestions({
  children,
  className,
  ...props
}: SuggestionsProps): React.ReactElement {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} {...props}>
      {children}
    </div>
  );
}

export interface SuggestionProps {
  suggestion: string;
  onSelect: (suggestion: string) => void;
  className?: string;
}

/** Quick-prompt pill (AI Elements `Suggestion`). */
export function Suggestion({
  suggestion,
  onSelect,
  className,
}: SuggestionProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => onSelect(suggestion)}
      className={cn(
        'rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-xs text-muted-foreground',
        'transition-colors hover:border-primary/40 hover:bg-white/5 hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className,
      )}
    >
      {suggestion}
    </button>
  );
}
