'use client';

import * as React from 'react';
import { ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConversationProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface ConversationContextValue {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  atBottom: boolean;
  scrollToBottom: () => void;
}

const ConversationContext = React.createContext<ConversationContextValue | null>(null);

/**
 * Scrollable chat container with sticky auto-scroll: it pins to the bottom while
 * new tokens stream unless the user scrolls up (parity with AI Elements
 * `Conversation` / `ConversationScrollButton`).
 */
export function Conversation({
  children,
  className,
  ...props
}: ConversationProps): React.ReactElement {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [atBottom, setAtBottom] = React.useState(true);

  const scrollToBottom = React.useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  const handleScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(distance < 48);
  }, []);

  const value = React.useMemo<ConversationContextValue>(
    () => ({ scrollRef, atBottom, scrollToBottom }),
    [atBottom, scrollToBottom],
  );

  return (
    <ConversationContext.Provider value={value}>
      <div className={cn('relative flex-1 overflow-hidden', className)} {...props}>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto"
          role="log"
          aria-live="polite"
          aria-label="Agent conversation"
        >
          {children}
        </div>
      </div>
    </ConversationContext.Provider>
  );
}

export interface ConversationContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Auto-scroll to bottom when this value changes (e.g. message/part count). */
  autoScrollKey?: string | number;
}

export function ConversationContent({
  children,
  className,
  autoScrollKey,
  ...props
}: ConversationContentProps): React.ReactElement {
  const ctx = React.useContext(ConversationContext);

  React.useEffect(() => {
    if (ctx?.atBottom) {
      ctx.scrollToBottom();
    }
    // Only re-run when the caller-provided key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScrollKey]);

  return (
    <div className={cn('flex flex-col gap-4 p-4', className)} {...props}>
      {children}
    </div>
  );
}

export interface ConversationEmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function ConversationEmptyState({
  title,
  description,
  icon,
  children,
}: ConversationEmptyStateProps): React.ReactElement {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      {icon ? <div className="text-foreground-subtle">{icon}</div> : null}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function ConversationScrollButton({
  className,
  label = 'Scroll to latest',
}: {
  className?: string;
  label?: string;
}): React.ReactElement | null {
  const ctx = React.useContext(ConversationContext);
  if (!ctx || ctx.atBottom) {
    return null;
  }
  return (
    <button
      type="button"
      onClick={ctx.scrollToBottom}
      aria-label={label}
      className={cn(
        'absolute bottom-4 left-1/2 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center',
        'rounded-full border border-border bg-surface-overlay text-foreground shadow-md',
        'transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className,
      )}
    >
      <ArrowDown className="h-4 w-4" />
    </button>
  );
}
