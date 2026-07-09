'use client';

import * as React from 'react';
import type { Story } from '@landi-flow/core/types';
import { Badge, cn } from '@landi-flow/ui';
import { isMockAuthEnabled } from '@/lib/api/config';
import {
  loadStorySlaStatus,
  type StorySlaStatus,
} from '@/controllers/settings-completion-controller';

export interface StorySlaBadgeProps {
  workspaceId: string;
  story: Story;
  className?: string;
}

function mockSlaStatus(story: Story): StorySlaStatus {
  const seededDue = story.sla_due_at;
  const breached =
    seededDue !== null && seededDue !== undefined
      ? new Date(seededDue).getTime() < Date.now()
      : story.id === 'story-005';
  return {
    story_id: story.id,
    sla_id: story.sla_id ?? null,
    sla_due_at: seededDue ?? (story.id === 'story-005' ? new Date(Date.now() - 3600_000).toISOString() : null),
    breached,
    due_in_hours: breached ? -2 : 24,
  };
}

/** CAP-074: computed SLA due/breach indicator on story detail. */
export function StorySlaBadge({
  workspaceId,
  story,
  className,
}: StorySlaBadgeProps): React.ReactElement | null {
  const [status, setStatus] = React.useState<StorySlaStatus | null>(null);

  React.useEffect(() => {
    if (isMockAuthEnabled()) {
      setStatus(mockSlaStatus(story));
      return;
    }

    let cancelled = false;
    void loadStorySlaStatus({
      workspaceId,
      teamId: story.team_id,
      storyId: story.id,
    })
      .then((next) => {
        if (!cancelled) {
          setStatus(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, story]);

  if (!status || (!status.sla_due_at && !status.breached)) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)} data-testid="story-sla-badge">
      <span className="text-xs text-muted-foreground">SLA</span>
      <Badge variant={status.breached ? 'destructive' : 'secondary'}>
        {status.breached ? 'Breached' : `Due in ${status.due_in_hours ?? '?'}h`}
      </Badge>
    </div>
  );
}
