'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from '@landi-flow/ui';
import { AppShell } from '@/components/app-shell';
import { InboxActivityFeed } from '@/components/inbox-activity-feed';
import { InboxNotificationsPanel } from '@/components/inbox-notifications-panel';
import { hydrateInbox } from '@/controllers/inbox-controller';
import { useInboxHydration } from '@/hooks/use-inbox-hydration';
import { useInboxStore } from '@/hooks/use-inbox-store';
import { useStoryStore } from '@/hooks/use-story-store';
import { usePathname, useRouter } from '@/i18n/navigation';
import {
  buildStoryModalQueryString,
  openStoryModal,
  resolveStoryIdFromQuery,
  type OpenStoryModalOptions,
} from '@/lib/story/open-story-modal';
import { isStoryDetailSectionId } from '@/lib/story/story-detail-sections';
import { useWorkspace } from '@/lib/workspace';
import { storyStore } from '@/stores/story-store';

function syncStoryModalUrl(
  pathname: string,
  story: { id: string; identifier: string } | undefined,
  options?: OpenStoryModalOptions,
): string {
  if (!story) {
    return pathname;
  }
  const query = buildStoryModalQueryString(story, options);
  return query.length > 0 ? `${pathname}?${query}` : pathname;
}

function InboxPageBody(): React.ReactElement {
  const { workspace } = useWorkspace();
  const { notifications, activity, loading, error } = useInboxStore();
  const { selectedStoryId, stories } = useStoryStore();
  const tNav = useTranslations('navigation');
  const tInbox = useTranslations('inbox');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useInboxHydration(workspace.id);

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

  React.useEffect(() => {
    const storyParam = searchParams.get('story');
    if (!storyParam || stories.length === 0) {
      return;
    }

    const storyId = resolveStoryIdFromQuery(storyParam, stories);
    if (!storyId) {
      return;
    }

    const sectionParam = searchParams.get('section');
    const signalParam = searchParams.get('signal');
    const section =
      sectionParam && isStoryDetailSectionId(sectionParam) ? sectionParam : undefined;

    if (
      selectedStoryId === storyId &&
      storyStore.getServerSnapshot().detailFocus.section === (section ?? null) &&
      storyStore.getServerSnapshot().detailFocus.highlightedSignalId === (signalParam ?? null)
    ) {
      return;
    }

    openStoryModal(storyId, {
      section,
      highlightedSignalId: signalParam,
    });
  }, [searchParams, selectedStoryId, stories]);

  React.useEffect(() => {
    if (selectedStoryId !== null) {
      return;
    }
    if (!searchParams.get('story')) {
      return;
    }
    router.replace(pathname, { scroll: false });
  }, [pathname, router, searchParams, selectedStoryId]);

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
