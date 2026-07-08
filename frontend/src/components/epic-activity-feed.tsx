'use client';

import * as React from 'react';
import type { ActivityEvent } from '@landi-flow/core/types';
import {
  Avatar,
  AvatarFallback,
  StoryIdentifierBadge,
  cn,
} from '@landi-flow/ui';
import { Activity, Bot } from 'lucide-react';
import { useLocalizedDateTime } from '@/hooks/use-localized-date-time';

export interface EpicActivityFeedProps {
  activity: ActivityEvent[];
  className?: string;
}

function formatEventType(eventType: string): string {
  return eventType.replace(/\./g, ' · ').replace(/_/g, ' ');
}

function actorInitials(event: ActivityEvent): string {
  if (event.actor_type === 'agent') {
    return 'AI';
  }
  const name = event.actor_name ?? 'Team';
  return name
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

function EpicActivityItem({ event }: { event: ActivityEvent }): React.ReactElement {
  const { formatDate } = useLocalizedDateTime();
  const formattedTime = formatDate(event.created_at, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <li
      data-testid="epic-activity-item"
      data-event-type={event.event_type}
      className="flex items-start gap-3 rounded-md px-2 py-2"
    >
      <span
        className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary/70"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          {event.actor_type === 'agent' ? (
            <Avatar actorType="agent" size="sm" aria-hidden="true">
              <AvatarFallback actorType="agent">
                <Bot className="h-3.5 w-3.5" />
              </AvatarFallback>
            </Avatar>
          ) : (
            <Avatar actorType="human" size="sm" aria-hidden="true">
              <AvatarFallback actorType="human">{actorInitials(event)}</AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground">
              <span className="font-medium">{event.actor_name ?? 'System'}</span>{' '}
              <span className="text-muted-foreground">{formatEventType(event.event_type)}</span>
            </p>
            {event.story_identifier ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StoryIdentifierBadge identifier={event.story_identifier} />
                {event.story_title ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {event.story_title}
                  </span>
                ) : null}
              </div>
            ) : null}
            <time
              className="mt-1 block font-mono text-xs tabular-nums text-muted-foreground"
              dateTime={event.created_at}
            >
              {formattedTime}
            </time>
          </div>
        </div>
      </div>
    </li>
  );
}

/** CAP-049: epic sidebar audit trail for humans and agents. */
export function EpicActivityFeed({
  activity,
  className,
}: EpicActivityFeedProps): React.ReactElement {
  return (
    <section
      className={cn('rounded-lg border border-border bg-surface-elevated/30', className)}
      data-testid="epic-activity-feed"
      data-cap="CAP-049"
      aria-label="Epic activity"
    >
      <header className="border-b border-border px-3 py-2.5">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Activity className="h-3.5 w-3.5" aria-hidden="true" />
          Activity
        </h3>
      </header>

      {activity.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          No activity on this Epic yet.
        </p>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto px-1 py-2" role="list">
          {activity.map((event) => (
            <EpicActivityItem key={event.id} event={event} />
          ))}
        </ul>
      )}
    </section>
  );
}
