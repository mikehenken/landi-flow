'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { isMockAuthEnabled } from '@/lib/api/config';
import { hydrateInbox } from '@/controllers/inbox-controller';
import { useStoryStore } from '@/hooks/use-story-store';
import { queryKeys } from '@/lib/query/query-keys';
import { WORKSPACE_QUERY_STALE_MS } from '@/lib/query/query-client';

export function useInboxHydration(workspaceId: string): void {
  const { stories } = useStoryStore();
  const mockAuth = isMockAuthEnabled();
  const storyCount = stories.length;

  useQuery({
    queryKey: queryKeys.inbox.workspace(workspaceId),
    queryFn: async () => {
      await hydrateInbox(workspaceId);
      return true;
    },
    enabled: Boolean(workspaceId),
    staleTime: WORKSPACE_QUERY_STALE_MS,
    // Mock inbox is derived from stories — revalidate when story count changes.
    meta: { storyCount: mockAuth ? storyCount : undefined },
  });

  // Keep mock path responsive when stories hydrate after mount.
  React.useEffect(() => {
    if (!mockAuth || !workspaceId) {
      return;
    }
    void hydrateInbox(workspaceId).catch(() => {
      /* error stored on inboxStore */
    });
  }, [mockAuth, workspaceId, storyCount]);
}
