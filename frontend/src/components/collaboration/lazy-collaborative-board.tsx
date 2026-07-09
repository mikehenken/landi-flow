'use client';

import dynamic from 'next/dynamic';
import * as React from 'react';
import { WorkspaceContentSkeleton } from '@/components/workspace-content-skeleton';

function BoardLoadingFallback(): React.ReactElement {
  return (
    <div className="flex h-full min-h-[16rem] items-center justify-center p-6">
      <WorkspaceContentSkeleton className="w-full max-w-3xl" />
    </div>
  );
}

export const CollaborativeBoardLazy = dynamic(
  () =>
    import('@/components/collaboration/collaborative-board').then((module) => ({
      default: module.CollaborativeBoard,
    })),
  {
    ssr: false,
    loading: BoardLoadingFallback,
  },
);
