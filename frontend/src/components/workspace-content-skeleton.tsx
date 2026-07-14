'use client';

import * as React from 'react';
import { cn } from '@landi-flow/ui';

export interface WorkspaceContentSkeletonProps {
  className?: string;
}

function SkeletonBar({ className }: { className?: string }): React.ReactElement {
  return <div className={cn('animate-pulse rounded bg-white/10', className)} aria-hidden="true" />;
}

/** Placeholder rows shown until domain stores hydrate (task-09t). */
export function WorkspaceContentSkeleton({
  className,
}: WorkspaceContentSkeletonProps): React.ReactElement {
  return (
    <div
      data-testid="workspace-content-skeleton"
      role="status"
      aria-busy="true"
      aria-label="Loading workspace"
      className={cn('flex h-full min-h-[12rem] flex-col px-4 py-6 sm:px-6', className)}
    >
      <div className="mb-6 flex items-center gap-3">
        <SkeletonBar className="h-8 w-48" />
        <SkeletonBar className="ms-auto hidden h-8 w-32 sm:block" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <SkeletonBar className="h-4 w-16 shrink-0" />
            <SkeletonBar className="h-4 flex-1" />
            <SkeletonBar className="hidden h-4 w-12 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

function StoryListSkeletonRow(): React.ReactElement {
  return (
    <div className="flex h-10 items-center gap-2 px-4 sm:gap-3 sm:px-6" aria-hidden="true">
      <SkeletonBar className="h-4 w-14 shrink-0" />
      <SkeletonBar className="h-4 flex-1" />
      <SkeletonBar className="h-4 w-10 shrink-0" />
    </div>
  );
}

/** List-shaped skeleton for story index while store loading is true. */
export function StoryListSkeleton(): React.ReactElement {
  return (
    <div
      data-testid="story-list-skeleton"
      role="status"
      aria-busy="true"
      aria-label="Loading stories"
      className="divide-y divide-border-subtle"
    >
      {Array.from({ length: 10 }).map((_, index) => (
        <StoryListSkeletonRow key={index} />
      ))}
    </div>
  );
}
