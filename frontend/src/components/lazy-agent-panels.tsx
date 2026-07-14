'use client';

import dynamic from 'next/dynamic';
import * as React from 'react';
import { WorkspaceContentSkeleton } from '@/components/workspace-content-skeleton';

function AgentsLoadingFallback(): React.ReactElement {
  return (
    <div className="flex h-full min-h-[16rem] items-center justify-center p-6">
      <WorkspaceContentSkeleton className="w-full max-w-xl" />
    </div>
  );
}

export const AgentChatPanelLazy = dynamic(
  () =>
    import('@/components/agent-chat-panel').then((module) => ({
      default: module.AgentChatPanel,
    })),
  {
    ssr: false,
    loading: AgentsLoadingFallback,
  },
);

export const AgentRosterPanelLazy = dynamic(
  () =>
    import('@/components/agent-roster-panel').then((module) => ({
      default: module.AgentRosterPanel,
    })),
  {
    ssr: false,
    loading: AgentsLoadingFallback,
  },
);
