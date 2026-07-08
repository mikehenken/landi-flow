'use client';

import * as React from 'react';
import { ArrowUp, Loader2, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentChatStatus } from './types';

export interface PromptInputProps
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  onSubmit: () => void;
  children: React.ReactNode;
}

export function PromptInput({
  onSubmit,
  children,
  className,
  ...props
}: PromptInputProps): React.ReactElement {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className={cn(
        'rounded-lg border border-border bg-surface-elevated shadow-sm focus-within:ring-1 focus-within:ring-primary',
        className,
      )}
      {...props}
    >
      {children}
    </form>
  );
}

export interface PromptInputTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Submit on Enter (Shift+Enter inserts a newline). */
  onEnterSubmit?: () => void;
}

export function PromptInputTextarea({
  className,
  onEnterSubmit,
  onKeyDown,
  ...props
}: PromptInputTextareaProps): React.ReactElement {
  const ref = React.useRef<HTMLTextAreaElement | null>(null);

  const autosize = React.useCallback(() => {
    const el = ref.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, []);

  React.useEffect(() => {
    autosize();
  }, [autosize, props.value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      onInput={autosize}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey && onEnterSubmit) {
          event.preventDefault();
          onEnterSubmit();
        }
        onKeyDown?.(event);
      }}
      className={cn(
        'w-full resize-none bg-transparent px-3 py-3 text-sm text-foreground outline-none',
        'placeholder:text-foreground-subtle',
        className,
      )}
      {...props}
    />
  );
}

export interface PromptInputToolbarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PromptInputToolbar({
  children,
  className,
  ...props
}: PromptInputToolbarProps): React.ReactElement {
  return (
    <div
      className={cn('flex items-center gap-2 border-t border-border px-2 py-1.5', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface PromptInputSubmitProps {
  status: AgentChatStatus;
  disabled?: boolean;
  onStop?: () => void;
  className?: string;
}

/**
 * Submit / stop control whose affordance is driven by the stream `status`
 * (submitted | streaming → stop; ready | idle → send).
 */
export function PromptInputSubmit({
  status,
  disabled = false,
  onStop,
  className,
}: PromptInputSubmitProps): React.ReactElement {
  const busy = status === 'submitted' || status === 'streaming';

  if (busy) {
    return (
      <button
        type="button"
        onClick={onStop}
        aria-label="Stop generating"
        className={cn(
          'ml-auto flex h-7 w-7 items-center justify-center rounded-md bg-surface-overlay text-foreground',
          'hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          className,
        )}
      >
        {status === 'submitted' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Square className="h-3.5 w-3.5 fill-current" />
        )}
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={disabled}
      aria-label="Send message"
      className={cn(
        'ml-auto flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground',
        'hover:bg-primary/90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className,
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
