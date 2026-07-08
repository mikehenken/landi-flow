'use client';

import * as React from 'react';
import type { Epic, Story, WorkflowState } from '@landi-flow/core/types';
import { Badge, cn } from '@landi-flow/ui';
import { Calendar, FileText, Users } from 'lucide-react';
import { getEpicStatusCategory } from '@/lib/epic-status';
import { computeEpicBurnup } from '@/lib/epic-progress';
import { deriveEpicActivity, getLatestEpicActivity } from '@/lib/epic-activity';
import { EpicBurnupChart } from '@/components/epic-burnup-chart';
import { EpicActivityFeed } from '@/components/epic-activity-feed';
import { EpicMilestonesPanel } from '@/components/milestones/epic-milestones-panel';
import { useLocalizedDateTime } from '@/hooks/use-localized-date-time';

export interface EpicDetailSidebarProps {
  epic: Epic;
  epicStories: Story[];
  workflowStates: WorkflowState[];
  className?: string;
}

/** CAP-048 + CAP-049: epic detail sidebar with burn-up graph and activity stream. */
export function EpicDetailSidebar({
  epic,
  epicStories,
  workflowStates,
  className,
}: EpicDetailSidebarProps): React.ReactElement {
  const progress = React.useMemo(
    () => computeEpicBurnup(epicStories, workflowStates, epic.start_date, epic.target_date),
    [epicStories, workflowStates, epic.start_date, epic.target_date],
  );
  const activity = React.useMemo(() => deriveEpicActivity(epic.id), [epic.id]);

  return (
    <aside
      className={cn(
        'flex w-full shrink-0 flex-col gap-4 border-t border-border p-4 lg:w-80 lg:border-l lg:border-t-0 xl:w-96',
        className,
      )}
      data-testid="epic-detail-sidebar"
    >
      <EpicMilestonesPanel epic={epic} stories={epicStories} />
      <EpicBurnupChart progress={progress} />
      <EpicActivityFeed activity={activity} />
    </aside>
  );
}

export interface EpicOverviewPanelProps {
  epic: Epic;
  epicStories: Story[];
  children?: React.ReactNode;
  className?: string;
}

/** CAP-043: epic overview — description, resources, and latest update. */
export function EpicOverviewPanel({
  epic,
  epicStories,
  children,
  className,
}: EpicOverviewPanelProps): React.ReactElement {
  const { formatDate } = useLocalizedDateTime();
  const latestActivity = React.useMemo(() => getLatestEpicActivity(epic.id), [epic.id]);

  const formattedStart = epic.start_date
    ? formatDate(epic.start_date, { dateStyle: 'medium' })
    : null;
  const formattedTarget = epic.target_date
    ? formatDate(epic.target_date, { dateStyle: 'medium' })
    : null;

  return (
    <section
      className={cn('flex flex-col gap-6 px-6 py-4', className)}
      data-testid="epic-overview-panel"
      data-cap="CAP-043"
    >
      <Badge variant={getEpicStatusCategory(epic) === 'in_progress' ? 'statusInProgress' : 'secondary'}>
        Epic · {getEpicStatusCategory(epic).replace(/_/g, ' ')}
      </Badge>

      {children}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ResourceCard
          icon={<FileText className="h-4 w-4" aria-hidden="true" />}
          label="Stories"
          value={String(epicStories.length)}
        />
        <ResourceCard
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
          label="Lead"
          value={epic.lead_id ? 'Assigned' : 'Unassigned'}
        />
        <ResourceCard
          icon={<Calendar className="h-4 w-4" aria-hidden="true" />}
          label="Timeline"
          value={
            formattedStart && formattedTarget
              ? `${formattedStart} → ${formattedTarget}`
              : formattedTarget ?? formattedStart ?? 'Not scheduled'
          }
        />
      </div>

      <div
        className="rounded-lg border border-border bg-surface-elevated/30 px-4 py-3"
        data-testid="epic-latest-update"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Latest update
        </h3>
        {latestActivity ? (
          <p className="mt-2 text-sm text-foreground">
            <span className="font-medium">{latestActivity.actor_name ?? 'System'}</span>{' '}
            <span className="text-muted-foreground">
              {latestActivity.event_type.replace(/\./g, ' · ').replace(/_/g, ' ')}
            </span>
            {latestActivity.story_identifier ? (
              <span className="ml-1 font-mono text-xs text-primary">
                {latestActivity.story_identifier}
              </span>
            ) : null}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No updates yet.</p>
        )}
      </div>
    </section>
  );
}

function ResourceCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated/20 px-3 py-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
