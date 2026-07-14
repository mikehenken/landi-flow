import * as React from 'react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StoryWorkflowStatus = 'todo' | 'in_progress' | 'done' | 'canceled';

const storyStatusVariant: Record<
  StoryWorkflowStatus,
  NonNullable<BadgeProps['variant']>
> = {
  todo: 'statusTodo',
  in_progress: 'statusInProgress',
  done: 'statusDone',
  canceled: 'secondary',
};

export interface StoryBadgeProps extends Omit<BadgeProps, 'variant'> {
  /** Story title — UI uses Story, not Issue. */
  title: string;
  status?: StoryWorkflowStatus;
  showLabel?: boolean;
}

/**
 * Story badge component — HITM: Story replaces Issue in UI.
 */
export function StoryBadge({
  title,
  status = 'todo',
  showLabel = false,
  className,
  ...props
}: StoryBadgeProps): React.ReactElement {
  return (
    <Badge
      variant={storyStatusVariant[status]}
      className={cn('max-w-[240px] gap-1', className)}
      title={title}
      {...props}
    >
      {showLabel ? (
        <span className="text-foreground-subtle">Story</span>
      ) : null}
      <span className="truncate">{title}</span>
    </Badge>
  );
}

export interface StoryIdentifierBadgeProps extends BadgeProps {
  /** Story identifier e.g. LAN-42 */
  identifier: string;
}

/** Story ID chip with tabular-nums per brand-identity. */
export function StoryIdentifierBadge({
  identifier,
  className,
  ...props
}: StoryIdentifierBadgeProps): React.ReactElement {
  return (
    <Badge
      variant="outline"
      size="sm"
      className={cn('font-mono tabular-nums text-foreground-subtle', className)}
      {...props}
    >
      {identifier}
    </Badge>
  );
}

export interface StoryPriorityBadgeProps extends BadgeProps {
  priority: 'none' | 'low' | 'medium' | 'high' | 'urgent';
}

const priorityVariant: Record<
  StoryPriorityBadgeProps['priority'],
  NonNullable<BadgeProps['variant']>
> = {
  none: 'secondary',
  low: 'secondary',
  medium: 'statusInProgress',
  high: 'statusWarning',
  urgent: 'destructive',
};

export function StoryPriorityBadge({
  priority,
  className,
  ...props
}: StoryPriorityBadgeProps): React.ReactElement {
  return (
    <Badge
      variant={priorityVariant[priority]}
      size="sm"
      className={cn('capitalize', className)}
      {...props}
    >
      {priority === 'none' ? 'No priority' : priority}
    </Badge>
  );
}
