'use client';

import * as React from 'react';
import { useTranslations } from '@landi-flow/ui';
import { AppShell } from '@/components/app-shell';
import { InboxActivityFeed } from '@/components/inbox-activity-feed';
import { InboxNotificationsPanel } from '@/components/inbox-notifications-panel';
import { hydrateInbox } from '@/controllers/inbox-controller';
import { StoryDetailSurface } from '@/components/story-detail-panel';
import { useDefaultTeamLabel } from '@/hooks/use-default-team-label';
import { useInboxHydration } from '@/hooks/use-inbox-hydration';
import { useInboxStore } from '@/hooks/use-inbox-store';
import { useSelectedStoryId } from '@/hooks/use-selected-story-id';
import { useStoryStore } from '@/hooks/use-story-store';
import { useStoryDeepLink, useStoryModalSelect } from '@/lib/story/use-story-deep-link';
import { useWorkspace } from '@/lib/workspace';
import { storyStore } from '@/stores/story-store';

function InboxPageBody(): React.ReactElement {
  const { workspace } = useWorkspace();
  const { notifications, activity, loading, error } = useInboxStore();
  const { stories } = useStoryStore();
  const selectedStoryId = useSelectedStoryId();
  const tNav = useTranslations('navigation');
  const tInbox = useTranslations('inbox');
  useInboxHydration(workspace.id);
  useStoryDeepLink();
  const handleStorySelect = useStoryModalSelect();

  const handleRetry = React.useCallback(() => {
    void hydrateInbox(workspace.id).catch(() => {
      /* error stored on inboxStore */
    });
  }, [workspace.id]);

  const unreadCount = notifications.filter((row) => !row.read).length;
  const selectedStory =
    stories.find((story) => story.id === selectedStoryId) ??
    storyStore.getServerSnapshot().stories.find((story) => story.id === selectedStoryId) ??
    null;

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col">
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
      <StoryDetailSurface
        story={selectedStory}
        onClose={() => storyStore.selectStory(null)}
      />
    </div>
  );
}

export default function WorkspaceInboxPage(): React.ReactElement {
  const t = useTranslations('navigation');
  const teamLabel = useDefaultTeamLabel(t('inbox.team_breadcrumb'));

  return (
    <AppShell
      viewTitle={t('inbox.title')}
      breadcrumbs={[teamLabel, t('inbox.title')]}
    >
      <InboxPageBody />
    </AppShell>
  );
}
