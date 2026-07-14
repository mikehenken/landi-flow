'use client';

import * as React from 'react';
import type { ActivityEvent, Story } from '@landi-flow/core/types';
import { Button, cn } from '@landi-flow/ui';
import { Radio, ChevronDown, ChevronRight } from 'lucide-react';
import { SignalContentViewer } from '@/components/story-lifecycle/signal-content-viewer';
import { signalKindIcon } from '@/lib/story-lifecycle/signal-payload';
import {
  extractEngineeringSignal,
  extractEngineeringSignals,
  isSignalAttachedEvent,
  sortEngineeringSignalsNewestFirst,
  type EngineeringSignalView,
} from '@/lib/story-lifecycle/story-signals';
import {
  buildListResetKey,
  ensureIndexVisible,
  getNextVisibleCount,
  getPaginationMeta,
  SIGNALS_PAGE_BATCH,
  SIGNALS_PAGE_DEFAULT,
  sliceVisibleItems,
} from '@/lib/list-pagination';

export interface StorySignalsPanelProps {
  story: Story;
  className?: string;
  highlightedSignalId?: string | null;
  activity: ActivityEvent[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  /** When true, list grows with parent scroll instead of nested max-height. */
  unifiedScroll?: boolean;
}

function SignalRow({
  signal,
  highlighted,
}: {
  signal: EngineeringSignalView;
  highlighted: boolean;
}): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <li
      id={`story-signal-${signal.id}`}
      className={cn(
        'rounded-md border border-border bg-surface-elevated/20',
        highlighted && 'ring-2 ring-primary/60',
      )}
      data-testid="story-signal-row"
      data-signal-kind={signal.kind}
    >
      <button
        type="button"
        className="flex w-full items-start gap-2 p-3 text-left"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className="text-base" aria-hidden="true">
          {signalKindIcon(signal.kind)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{signal.title}</p>
          <p className="text-xs text-muted-foreground truncate">{signal.summary}</p>
          <p className="mt-1 text-[10px] uppercase text-foreground-subtle">
            {signal.kind.replace(/_/g, ' ')}
            {signal.status ? ` · ${signal.status}` : ''}
            {' · '}
            {signal.actorName ?? 'System'}
            {' · '}
            {new Date(signal.createdAt).toLocaleString()}
          </p>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
      </button>

      {expanded ? (
        <div className="border-t border-border px-3 pb-3" data-testid="story-signal-expand-panel">
          <SignalContentViewer signal={signal} className="mt-2" />
        </div>
      ) : null}
    </li>
  );
}

function LoadMoreButton({
  nextBatchSize,
  remainingCount,
  onLoadMore,
  testId,
  itemLabel,
}: {
  nextBatchSize: number;
  remainingCount: number;
  onLoadMore: () => void;
  testId: string;
  itemLabel: string;
}): React.ReactElement | null {
  if (remainingCount <= 0) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 w-full text-xs text-muted-foreground"
      onClick={onLoadMore}
      data-testid={testId}
      aria-label={`Show ${nextBatchSize} more ${itemLabel}, ${remainingCount} remaining`}
    >
      Show {nextBatchSize} more
      {remainingCount > nextBatchSize ? ` (${remainingCount} total remaining)` : null}
    </Button>
  );
}

/** MCP-IDE-003: engineering signals attached via MCP or assignment flow. */
export function StorySignalsPanel({
  className,
  highlightedSignalId = null,
  activity,
  loading,
  error,
  onRetry,
  unifiedScroll = false,
}: StorySignalsPanelProps): React.ReactElement {
  const signals = React.useMemo(
    () => sortEngineeringSignalsNewestFirst(extractEngineeringSignals(activity)),
    [activity],
  );
  const signalsResetKey = React.useMemo(
    () =>
      buildListResetKey([
        activity.length,
        signals[0]?.id,
        signals[signals.length - 1]?.id,
      ]),
    [activity.length, signals],
  );
  const [visibleCount, setVisibleCount] = React.useState(SIGNALS_PAGE_DEFAULT);

  React.useEffect(() => {
    setVisibleCount(SIGNALS_PAGE_DEFAULT);
  }, [signalsResetKey]);

  React.useEffect(() => {
    if (!highlightedSignalId) {
      return;
    }
    const index = signals.findIndex((signal) => signal.id === highlightedSignalId);
    if (index >= 0) {
      setVisibleCount((current) =>
        ensureIndexVisible(current, index, SIGNALS_PAGE_DEFAULT),
      );
    }
  }, [highlightedSignalId, signals]);

  const visibleSignals = sliceVisibleItems(signals, visibleCount);
  const { hasMore, remainingCount, nextBatchSize } = getPaginationMeta(
    signals.length,
    visibleCount,
    SIGNALS_PAGE_BATCH,
  );

  const handleLoadMore = React.useCallback((): void => {
    setVisibleCount((current) =>
      getNextVisibleCount(current, SIGNALS_PAGE_BATCH, signals.length),
    );
  }, [signals.length]);

  React.useEffect(() => {
    if (!highlightedSignalId) {
      return;
    }
    const element = document.getElementById(`story-signal-${highlightedSignalId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [highlightedSignalId, signals.length]);

  return (
    <section
      id="signals"
      className={cn('space-y-3 scroll-mt-4', className)}
      data-testid="story-signals-panel"
      data-cap="MCP-IDE-003"
      data-story-section="signals"
      aria-label="Engineering signals"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">
            Signals
          </h3>
        </div>
        {error ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading signals…</p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : signals.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="story-signals-empty">
          No engineering signals yet. Signals appear when agents attach progress updates or when you assign an agent to this story.
        </p>
      ) : (
        <div className="space-y-2">
          <ul className={cn('space-y-2', !unifiedScroll && 'max-h-96 overflow-y-auto')}>
            {visibleSignals.map((signal) => (
              <SignalRow
                key={signal.id}
                signal={signal}
                highlighted={highlightedSignalId === signal.id}
              />
            ))}
          </ul>
          {hasMore ? (
            <LoadMoreButton
              nextBatchSize={nextBatchSize}
              remainingCount={remainingCount}
              onLoadMore={handleLoadMore}
              testId="story-signals-load-more"
              itemLabel="signals"
            />
          ) : null}
        </div>
      )}
    </section>
  );
}

export function formatStoryHistoryEventLabel(event: ActivityEvent): string {
  if (isSignalAttachedEvent(event)) {
    const signal = extractEngineeringSignal(event);
    return signal ? `attached signal · ${signal.title}` : 'attached signal';
  }
  return event.event_type.replace(/\./g, ' · ').replace(/_/g, ' ');
}

export function isStoryHistorySignalLink(event: ActivityEvent): boolean {
  return isSignalAttachedEvent(event);
}
