import * as React from 'react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type EpicStatusCategory =
  | 'backlog'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

const epicStatusVariant: Record<
  EpicStatusCategory,
  NonNullable<BadgeProps['variant']>
> = {
  backlog: 'statusTodo',
  planned: 'secondary',
  in_progress: 'statusInProgress',
  completed: 'statusDone',
  cancelled: 'secondary',
};

export interface EpicBadgeProps extends Omit<BadgeProps, 'variant'> {
  /** Epic name — never "Project". */
  name: string;
  status?: EpicStatusCategory;
  showLabel?: boolean;
}

/**
 * Epic badge component — HITM: Epic replaces Project globally.
 */
export function EpicBadge({
  name,
  status = 'backlog',
  showLabel = false,
  className,
  ...props
}: EpicBadgeProps): React.ReactElement {
  return (
    <Badge
      variant={epicStatusVariant[status]}
      className={cn('max-w-[200px] gap-1', className)}
      title={name}
      {...props}
    >
      {showLabel ? (
        <span className="text-foreground-subtle">Epic</span>
      ) : null}
      <span className="truncate">{name}</span>
    </Badge>
  );
}

export interface EpicIdentifierBadgeProps extends BadgeProps {
  epicId: string;
}

/** Compact Epic ID chip for list views. */
export function EpicIdentifierBadge({
  epicId,
  className,
  ...props
}: EpicIdentifierBadgeProps): React.ReactElement {
  return (
    <Badge
      variant="outline"
      size="sm"
      className={cn('font-mono tabular-nums', className)}
      {...props}
    >
      {epicId}
    </Badge>
  );
}
