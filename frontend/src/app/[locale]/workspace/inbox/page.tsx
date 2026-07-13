'use client';

import * as React from 'react';
import { useTranslations } from '@landi-flow/ui';
import { AppShell } from '@/components/app-shell';
import { InboxActivityFeed } from '@/components/inbox-activity-feed';
import { InboxNotificationsPanel } from '@/components/inbox-notifications-panel';
import { hydrateInbox } from '@/controllers/inbox-controller';
import { useDefaultTeamLabel } from '@/hooks/use-default-team-label';
import { useInboxHydration } from '@/hooks/use-inbox-hydration';
import { useInboxStore } from '@/hooks/use-inbox-store';
import { useStoryStore } from '@/hooks/use-story-store';
import { usePathname, useRouter } from '@/i18n/navigation';
import {
  openStoryModal,
  type OpenStoryModalOptions,
} from '@/lib/story/open-story-modal';
import { syncStoryModalUrl, useStoryDeepLink } from '@/lib/story/use-story-deep-link';
import { useWorkspace } from '@/lib/workspace';
import { storyStore } from '@/stores/story-store';

function InboxPageBody(): React.ReactElement {
  const { workspace } = useWorkspace();
  const { notifications, activity, loading, error } = useInboxStore();
  const { selectedStoryId } = useStoryStore();
  const tNav = useTranslations('navigation');
  const tInbox = useTranslations('inbox');
  const router = useRouter();
  const pathname = usePathname();

  useInboxHydration(workspace.id);
  useStoryDeepLink();

  const handleRetry = React.useCallback(() => {
    void hydrateInbox(workspace.id).catch(() => {
      /* error stored on inboxStore */
    });
  }, [workspace.id]);

  const handleStorySelect = React.useCallback(
    (storyId: string, options?: OpenStoryModalOptions) => {
      openStoryModal(storyId, options);
      const story = storyStore.getServerSnapshot().stories.find((row) => row.id === storyId);
      router.replace(syncStoryModalUrl(pathname, story, options), { scroll: false });
    },
    [pathname, router],
  );

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
