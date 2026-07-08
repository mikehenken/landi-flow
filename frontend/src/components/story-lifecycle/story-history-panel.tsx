'use client';

import * as React from 'react';
import type { Story } from '@landi-flow/core/types';
import { Button, cn } from '@landi-flow/ui';
import { History, RotateCcw } from 'lucide-react';
import { updateStoryDescription } from '@/controllers/story-controller';
import {
  deriveStoryActivity,
  extractRestorableDescription,
} from '@/lib/story-lifecycle/story-history';

export interface StoryHistoryPanelProps {
  story: Story;
  className?: string;
}

/** CAP-011: property/description history with undo restore. */
export function StoryHistoryPanel({
  story,
  className,
}: StoryHistoryPanelProps): React.ReactElement {
  const activity = React.useMemo(() => deriveStoryActivity(story.id), [story.id]);
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
      className={cn('space-y-3', className)}
      data-testid="story-history-panel"
      data-cap="CAP-011"
    >
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          History
        </h3>
      </div>

      {activity.length === 0 ? (
        <p className="text-sm text-muted-foreground">No history yet.</p>
      ) : (
        <ul className="max-h-48 space-y-2 overflow-y-auto">
          {activity.map((event) => {
            const restorable = extractRestorableDescription(event);
            return (
              <li
                key={event.id}
                className="rounded-md border border-border bg-surface-elevated/20 px-3 py-2"
                data-testid="story-history-item"
              >
                <p className="text-sm text-foreground">
                  <span className="font-medium">{event.actor_name ?? 'System'}</span>{' '}
                  <span className="text-muted-foreground">
                    {event.event_type.replace(/\./g, ' · ')}
                  </span>
                </p>
                <time className="text-xs text-muted-foreground" dateTime={event.created_at}>
                  {new Date(event.created_at).toLocaleString()}
                </time>
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
