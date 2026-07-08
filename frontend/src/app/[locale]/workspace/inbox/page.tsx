'use client';

import * as React from 'react';
import { useTranslations } from '@landi-flow/ui';
import { AppShell } from '@/components/app-shell';
import { InboxActivityFeed } from '@/components/inbox-activity-feed';
import { InboxNotificationsPanel } from '@/components/inbox-notifications-panel';
import { hydrateInbox } from '@/controllers/inbox-controller';
import { useInboxHydration } from '@/hooks/use-inbox-hydration';
import { useInboxStore } from '@/hooks/use-inbox-store';
import { useStoryStore } from '@/hooks/use-story-store';
import { useWorkspace } from '@/lib/workspace';
import { storyStore } from '@/stores/story-store';

function InboxPageBody(): React.ReactElement {
  const { workspace } = useWorkspace();
  const { notifications, activity, loading, error } = useInboxStore();
  const { selectedStoryId } = useStoryStore();
  const tNav = useTranslations('navigation');
  const tInbox = useTranslations('inbox');

  useInboxHydration(workspace.id);

  const handleRetry = React.useCallback(() => {
    void hydrateInbox(workspace.id).catch(() => {
      /* error stored on inboxStore */
    });
  }, [workspace.id]);

  const handleStorySelect = React.useCallback((storyId: string) => {
    storyStore.selectStory(storyId);
  }, []);

  const unreadCount = notifications.filter((row) => !row.read).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            {loading
              ? tInbox('welcome.loading')
              : tNav('inbox.welcome', {
                  count: notifications.length,
                  unread: unreadCount,
                })}
          </p>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <InboxNotificationsPanel
          notifications={notifications}
          loading={loading}
          error={error}
          selectedStoryId={selectedStoryId}
          onStorySelect={handleStorySelect}
          onRetry={handleRetry}
        />
        <InboxActivityFeed
          activity={activity}
          loading={loading}
          error={error}
          selectedStoryId={selectedStoryId}
          onStorySelect={handleStorySelect}
          onRetry={handleRetry}
        />
      </div>
    </div>
  );
}

export default function WorkspaceInboxPage(): React.ReactElement {
  const t = useTranslations('navigation');

  return (
    <AppShell
      viewTitle={t('inbox.title')}
      breadcrumbs={[t('inbox.team_breadcrumb'), t('inbox.title')]}
    >
      <InboxPageBody />
    </AppShell>
  );
}
