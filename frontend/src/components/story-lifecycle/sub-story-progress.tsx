'use client';

import * as React from 'react';
import type { Story } from '@landi-flow/core/types';
import { cn } from '@landi-flow/ui';
import { useStoryStore } from '@/hooks/use-story-store';
import { getSubStoryIds } from '@/lib/story-relations-seed';
import { DEMO_WORKFLOW_STATE_ROWS } from '@/lib/seed-data';
import { computeSubStoryProgress } from '@/lib/story-lifecycle/sub-story-progress';

export interface SubStoryProgressChipProps {
  parentStoryId: string;
  className?: string;
}

/** CAP-006: sub-story completion indicator for board/list cards. */
export function SubStoryProgressChip({
  parentStoryId,
  className,
}: SubStoryProgressChipProps): React.ReactElement | null {
  const { stories } = useStoryStore();
  const childIds = getSubStoryIds(parentStoryId);
  if (childIds.length === 0) {
    return null;
  }

  const progress = computeSubStoryProgress(parentStoryId, stories, DEMO_WORKFLOW_STATE_ROWS);
  if (!progress) {
    return null;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground',
        className,
      )}
      data-testid="sub-story-progress"
      data-cap="CAP-006"
      title={`${progress.completed}/${progress.total} sub-stories complete`}
    >
      {progress.completed}/{progress.total} · {progress.percent}%
    </span>
  );
}

export interface SubStoriesListProps {
  parentStory: Story;
  className?: string;
}

export function SubStoriesList({
  parentStory,
  className,
}: SubStoriesListProps): React.ReactElement | null {
  const { stories } = useStoryStore();
  const childIds = getSubStoryIds(parentStory.id);
  if (childIds.length === 0) {
    return null;
  }

  const children = stories.filter((story) => childIds.includes(story.id));

  return (
    <section
      className={cn('space-y-2', className)}
      data-testid="sub-stories-list"
      data-cap="CAP-006"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sub-stories
      </h3>
      <ul className="space-y-1">
        {children.map((child) => (
          <li
            key={child.id}
            className="rounded-md border border-border px-2 py-1.5 text-sm"
            data-testid="sub-story-item"
          >
            <span className="font-mono text-xs text-primary">{child.identifier}</span>{' '}
            {child.title}
          </li>
        ))}
      </ul>
    </section>
  );
}
