'use client';

import * as React from 'react';
import type { Story } from '@landi-flow/core/types';
import { Button, cn } from '@landi-flow/ui';
import { Check, X } from 'lucide-react';
import {
  acceptTriageStory,
  declineTriageStory,
  listTriageStories,
} from '@/lib/triage/triage-store';

export interface TriageInboxPanelProps {
  teamId: string;
  stories: Story[];
  className?: string;
}

/** CAP-016: team-scoped triage inbox with accept/decline. */
export function TriageInboxPanel({
  teamId,
  stories,
  className,
}: TriageInboxPanelProps): React.ReactElement {
  const [, setTick] = React.useState(0);
  const triageStories = listTriageStories(teamId, stories);

  const handleAccept = (story: Story): void => {
    acceptTriageStory(story);
    setTick((v) => v + 1);
  };

  const handleDecline = (story: Story): void => {
    declineTriageStory(story);
    setTick((v) => v + 1);
  };

  return (
    <section
      className={cn('flex flex-col gap-4 p-6', className)}
      data-testid="triage-inbox-panel"
      data-cap="CAP-016"
    >
      <header>
        <h2 className="text-lg font-semibold">Triage inbox</h2>
        <p className="text-sm text-muted-foreground">
          Review incoming Stories and accept into the backlog or decline.
        </p>
      </header>

      {triageStories.length === 0 ? (
        <div
          className="rounded-lg border border-dashed border-border px-6 py-12 text-center"
          data-testid="triage-inbox-empty"
        >
          <p className="text-sm text-muted-foreground">No Stories awaiting triage.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="triage-inbox-list">
          {triageStories.map((story) => (
            <li
              key={story.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-elevated/30 px-4 py-3"
              data-testid="triage-inbox-item"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-primary">{story.identifier}</p>
                <p className="truncate text-sm font-medium">{story.title}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  data-testid="triage-accept"
                  onClick={() => handleAccept(story)}
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Accept
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="triage-decline"
                  onClick={() => handleDecline(story)}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Decline
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
