'use client';

import * as React from 'react';
import type { ActivityEvent } from '@landi-flow/core/types';
import {
  Avatar,
  AvatarFallback,
  StoryIdentifierBadge,
  cn,
  useTranslations,
} from '@landi-flow/ui';
import { Activity, Bot } from 'lucide-react';
import { useLocalizedDateTime } from '@/hooks/use-localized-date-time';
import { resolveSectionFromActivity } from '@/lib/story/resolve-story-detail-section';
import type { OpenStoryModalOptions } from '@/lib/story/open-story-modal';

export interface InboxActivityFeedProps {
  activity: ActivityEvent[];
  loading: boolean;
  error: string | null;
  selectedStoryId?: string | null;
  onStorySelect: (storyId: string, options?: OpenStoryModalOptions) => void;
  onRetry?: () => void;
}

function ActivitySkeletonRows(): React.ReactElement {
  return (
    <div className="space-y-4 px-4 py-4 sm:px-6" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex animate-pulse gap-3">
          <div className="mt-1 h-2 w-2 rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-full rounded bg-white/10" />
            <div className="h-2 w-2/3 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
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

function ActivityFeedItem({
  event,
  isSelected,
  onSelect,
}: {
  event: ActivityEvent;
  isSelected: boolean;
  onSelect: (storyId: string, options?: OpenStoryModalOptions) => void;
}): React.ReactElement {
  const t = useTranslations('inbox');
  const { formatDate } = useLocalizedDateTime();
  const formattedTime = formatDate(event.created_at, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const handleClick = (): void => {
    if (event.story_id) {
      const focus = resolveSectionFromActivity(event);
      onSelect(event.story_id, {
        section: focus.section,
        highlightedSignalId: focus.highlightedSignalId,
      });
    }
  };

  return (
    <li>
      <button
        type="button"
        data-testid="inbox-activity-item"
        data-event-type={event.event_type}
        onClick={handleClick}
        disabled={!event.story_id}
        className={cn(
          'flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors',
          event.story_id
            ? 'hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary'
            : 'cursor-default opacity-90',
          isSelected ? 'bg-white/10' : '',
        )}
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
                <span className="font-medium">{event.actor_name ?? t('activity.system_actor')}</span>{' '}
                <span className="text-muted-foreground">{formatEventType(event.event_type)}</span>
              </p>
              {event.story_identifier ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StoryIdentifierBadge identifier={event.story_identifier} />
                  {event.story_title ? (
                    <span className="truncate text-xs text-muted-foreground">{event.story_title}</span>
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
      </button>
    </li>
  );
}

export function InboxActivityFeed({
  activity,
  loading,
  error,
  selectedStoryId,
  onStorySelect,
  onRetry,
}: InboxActivityFeedProps): React.ReactElement {
  const t = useTranslations('inbox');

  if (loading) {
    return (
      <aside
        className="flex w-full shrink-0 flex-col border-t border-border lg:w-80 lg:border-l lg:border-t-0 xl:w-96"
        aria-label={t('activity.title')}
        data-testid="inbox-activity-feed"
        data-cap="CAP-015"
      >
        <header className="border-b border-border px-4 py-3 sm:px-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {t('activity.title')}
          </h2>
        </header>
        <ActivitySkeletonRows />
      </aside>
    );
  }

  if (error) {
    return (
      <aside
        className="flex w-full shrink-0 flex-col border-t border-border lg:w-80 lg:border-l lg:border-t-0 xl:w-96"
        aria-label={t('activity.title')}
        data-testid="inbox-activity-feed"
        data-cap="CAP-015"
        role="alert"
      >
        <header className="border-b border-border px-4 py-3 sm:px-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {t('activity.title')}
          </h2>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <p className="text-sm font-medium text-destructive">{t('error.title')}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
          {onRetry ? (
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={onRetry}
            >
              {t('error.retry')}
            </button>
          ) : null}
        </div>
      </aside>
    );
  }

  if (activity.length === 0) {
    return (
      <aside
        className="flex w-full shrink-0 flex-col border-t border-border lg:w-80 lg:border-l lg:border-t-0 xl:w-96"
        aria-label={t('activity.title')}
        data-testid="inbox-activity-feed"
        data-cap="CAP-015"
      >
        <header className="border-b border-border px-4 py-3 sm:px-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {t('activity.title')}
          </h2>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">{t('activity.empty.heading')}</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            {t('activity.empty.description')}
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="flex w-full shrink-0 flex-col border-t border-border lg:w-80 lg:border-l lg:border-t-0 xl:w-96"
      aria-label={t('activity.title')}
      data-testid="inbox-activity-feed"
      data-cap="CAP-015"
    >
      <header className="border-b border-border px-4 py-3 sm:px-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {t('activity.title')}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('activity.subtitle')}</p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-4">
        <ul className="space-y-1" role="list">
          {activity.map((event) => (
            <ActivityFeedItem
              key={event.id}
              event={event}
              isSelected={event.story_id === selectedStoryId}
              onSelect={onStorySelect}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}
