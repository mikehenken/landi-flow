'use client';

import * as React from 'react';
import type { InboxNotification } from '@landi-flow/core/types';
import {
  Avatar,
  AvatarFallback,
  StoryIdentifierBadge,
  cn,
  useTranslations,
} from '@landi-flow/ui';
import { Bell, Bot } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { markInboxNotificationRead } from '@/controllers/inbox-controller';
import { brandAssets } from '@/lib/correlation';

export interface InboxNotificationsPanelProps {
  notifications: InboxNotification[];
  loading: boolean;
  error: string | null;
  selectedStoryId?: string | null;
  onStorySelect: (storyId: string) => void;
  onRetry?: () => void;
}

function NotificationSkeletonRows(): React.ReactElement {
  return (
    <div className="divide-y divide-border-subtle" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex h-14 animate-pulse items-center gap-3 px-4 sm:px-6">
          <div className="h-8 w-8 rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 rounded bg-white/10" />
            <div className="h-2 w-1/2 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function actorInitials(notification: InboxNotification): string {
  if (notification.actor_type === 'agent') {
    return 'AI';
  }
  const name = notification.actor_name ?? 'Team';
  return name
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

export function InboxNotificationsPanel({
  notifications,
  loading,
  error,
  selectedStoryId,
  onStorySelect,
  onRetry,
}: InboxNotificationsPanelProps): React.ReactElement {
  const t = useTranslations('inbox');

  if (loading) {
    return (
      <section
        className="flex min-h-0 flex-1 flex-col"
        aria-label={t('notifications.title')}
        data-testid="inbox-notifications-panel"
        data-cap="CAP-035"
      >
        <header className="border-b border-border px-4 py-3 sm:px-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bell className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {t('notifications.title')}
          </h2>
        </header>
        <NotificationSkeletonRows />
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="flex min-h-0 flex-1 flex-col"
        aria-label={t('notifications.title')}
        data-testid="inbox-notifications-panel"
        data-cap="CAP-035"
        role="alert"
      >
        <header className="border-b border-border px-4 py-3 sm:px-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bell className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {t('notifications.title')}
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
      </section>
    );
  }

  if (notifications.length === 0) {
    return (
      <section
        className="flex min-h-0 flex-1 flex-col"
        aria-label={t('notifications.title')}
        data-testid="inbox-notifications-panel"
        data-cap="CAP-035"
      >
        <header className="border-b border-border px-4 py-3 sm:px-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bell className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {t('notifications.title')}
          </h2>
        </header>
        <EmptyState
          heading={t('notifications.empty.heading')}
          description={t('notifications.empty.description')}
          ctaLabel={t('notifications.empty.cta')}
          imageSrc={brandAssets.heroGraphic}
          imageAlt={t('notifications.title')}
          className="flex-1"
        />
      </section>
    );
  }

  return (
    <section
      className="flex min-h-0 flex-1 flex-col"
      aria-label={t('notifications.title')}
      data-testid="inbox-notifications-panel"
      data-cap="CAP-035"
    >
      <header className="border-b border-border px-4 py-3 sm:px-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Bell className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {t('notifications.title')}
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {t('notifications.unread_count', {
              count: notifications.filter((row) => !row.read).length,
            })}
          </span>
        </h2>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="divide-y divide-border-subtle" role="list">
          {notifications.map((notification) => {
            const isSelected = notification.story_id === selectedStoryId;
            const isUnread = !notification.read;

            return (
              <button
                key={notification.id}
                type="button"
                role="listitem"
                data-testid="inbox-notification-item"
                data-notification-kind={notification.kind}
                onClick={() => {
                  markInboxNotificationRead(notification.id);
                  if (notification.story_id) {
                    onStorySelect(notification.story_id);
                  }
                }}
                className={cn(
                  'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors sm:px-6',
                  'hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                  isSelected ? 'bg-white/10' : '',
                  isUnread ? 'border-l-2 border-l-primary' : 'border-l-2 border-l-transparent',
                )}
              >
                {notification.actor_type === 'agent' ? (
                  <Avatar actorType="agent" size="sm" aria-hidden="true">
                    <AvatarFallback actorType="agent">
                      <Bot className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar actorType="human" size="sm" aria-hidden="true">
                    <AvatarFallback actorType="human">{actorInitials(notification)}</AvatarFallback>
                  </Avatar>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {notification.story_identifier ? (
                      <StoryIdentifierBadge identifier={notification.story_identifier} />
                    ) : null}
                    <span
                      className={cn(
                        'text-sm',
                        isUnread ? 'font-semibold text-foreground' : 'text-foreground',
                      )}
                    >
                      {notification.summary}
                    </span>
                  </div>
                  <time
                    className="mt-1 block font-mono text-xs tabular-nums text-muted-foreground"
                    dateTime={notification.created_at}
                  >
                    {new Date(notification.created_at).toLocaleString()}
                  </time>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
