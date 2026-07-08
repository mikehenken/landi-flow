'use client';

import * as React from 'react';
import { isMockAuthEnabled } from '@/lib/api/config';
import { hydrateInbox } from '@/controllers/inbox-controller';
import { useStoryStore } from '@/hooks/use-story-store';

export function useInboxHydration(workspaceId: string): void {
  const { stories } = useStoryStore();
  const mockAuth = isMockAuthEnabled();
  const storyCount = stories.length;
  const hydrationKey = mockAuth ? `${workspaceId}:${storyCount}` : workspaceId;

  React.useEffect(() => {
    if (!workspaceId) {
      return;
    }

    void hydrateInbox(workspaceId).catch(() => {
      /* error stored on inboxStore */
    });
  }, [hydrationKey, workspaceId]);
}
