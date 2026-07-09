'use client';

import * as React from 'react';
import type { ActivityEvent, Story } from '@landi-flow/core/types';
import { Button, cn } from '@landi-flow/ui';
import { History, RotateCcw } from 'lucide-react';
import { updateStoryDescription } from '@/controllers/story-controller';
import {
  formatStoryHistoryEventLabel,
  isStoryHistorySignalLink,
} from '@/components/story-lifecycle/story-signals-panel';
import { extractRestorableDescription } from '@/lib/story-lifecycle/story-history';

export interface StoryHistoryPanelProps {
  story: Story;
  className?: string;
  onSignalSelect?: (activityEventId: string) => void;
  activity: ActivityEvent[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  /** When true, list grows with parent scroll instead of nested max-height. */
  unifiedScroll?: boolean;
}

/** CAP-011: property/description history with undo restore. */
export function StoryHistoryPanel({
  story,
  className,
  onSignalSelect,
  activity,
  loading,
  error,
  onRetry,
  unifiedScroll = false,
}: StoryHistoryPanelProps): React.ReactElement {
  const [restoringId, setRestoringId] = React.useState<string | null>(null);

  const handleUndo = async (eventId: string, previousMd: string): Promise<void> => {
    setRestoringId(eventId);
    try {
      await updateStoryDescription(story.workspace_id, story, previousMd);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <section
      id="history"
      className={cn('space-y-3 scroll-mt-4', className)}
      data-testid="story-history-panel"
      data-cap="CAP-011"
      data-story-section="history"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">
            Story Activity
          </h3>
        </div>
        {error ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading history…</p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : activity.length === 0 ? (
        <p className="text-sm text-muted-foreground">No history yet.</p>
      ) : (
        <ul className={cn('space-y-2', !unifiedScroll && 'max-h-48 overflow-y-auto')}>
          {activity.map((event) => {
            const restorable = extractRestorableDescription(event);
            const signalLink = isStoryHistorySignalLink(event);
            return (
              <li
                key={event.id}
                className="rounded-md border border-border bg-surface-elevated/20 px-3 py-2"
                data-testid="story-history-item"
                data-event-type={event.event_type}
              >
                <p className="text-sm text-foreground">
                  <span className="font-medium">{event.actor_name ?? 'System'}</span>{' '}
                  <span className="text-muted-foreground">
                    {formatStoryHistoryEventLabel(event)}
                  </span>
                </p>
                <time className="text-xs text-muted-foreground" dateTime={event.created_at}>
                  {new Date(event.created_at).toLocaleString()}
                </time>
                {signalLink && onSignalSelect ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-7 px-2 text-xs"
                    onClick={() => onSignalSelect(event.id)}
                    data-testid="story-history-view-signal"
                  >
                    View signal
                  </Button>
                ) : null}
                {restorable ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-7 px-2 text-xs"
                    disabled={restoringId === event.id}
                    onClick={() => void handleUndo(event.id, restorable)}
                    data-testid="story-history-undo"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Undo description
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
