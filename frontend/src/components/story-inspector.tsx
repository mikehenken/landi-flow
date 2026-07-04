'use client';

import * as React from 'react';
import type { Epic, Story } from '@landi-flow/core/types';
import {
  Badge,
  Button,
  EpicBadge,
  StoryIdentifierBadge,
  StoryPriorityBadge,
  cn,
} from '@landi-flow/ui';
import { getEpicById } from '@/lib/seed-data';
import { getEpicStatusCategory } from '@/lib/epic-status';
import { workflowStateToStatus } from '@/lib/workflow-states';

export interface StoryInspectorProps {
  story: Story | null;
  epic?: Epic | null;
  onClose?: () => void;
}

/** Right properties panel (280px) for selected Story metadata. */
export function StoryInspector({
  story,
  epic: epicProp,
  onClose,
}: StoryInspectorProps): React.ReactElement {
  if (!story) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Select a Story to view properties
        </p>
      </div>
    );
  }

  const epic = epicProp ?? (story.epic_id ? getEpicById(story.epic_id) : null);
  const status = workflowStateToStatus(story.workflow_state_id);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium text-foreground">Properties</h2>
        {onClose ? (
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close inspector">
            ✕
          </Button>
        ) : null}
      </div>

      <div className="space-y-6 p-4">
        <section>
          <StoryIdentifierBadge identifier={story.identifier} />
          <h3 className="text-lg font-semibold leading-snug text-foreground">
            {story.title}
          </h3>
          {story.description_md ? (
            <p className="mt-2 text-sm text-muted-foreground">{story.description_md}</p>
          ) : null}
        </section>

        <PropertyRow label="Status">
          <Badge
            variant={
              status === 'done'
                ? 'statusDone'
                : status === 'in_progress'
                  ? 'statusInProgress'
                  : status === 'canceled'
                    ? 'secondary'
                    : 'statusTodo'
            }
            className="capitalize"
          >
            {status.replace('_', ' ')}
          </Badge>
        </PropertyRow>

        <PropertyRow label="Priority">
          <StoryPriorityBadge priority={story.priority} />
        </PropertyRow>

        {epic ? (
          <PropertyRow label="Epic">
            <EpicBadge
              name={epic.name}
              status={getEpicStatusCategory(epic)}
              showLabel
            />
          </PropertyRow>
        ) : null}

        {story.delegate_agent_id ? (
          <PropertyRow label="Agent">
            <span className="text-sm text-foreground">
              {story.delegate_agent_id} on behalf of assignee
            </span>
          </PropertyRow>
        ) : null}

        <PropertyRow label="Updated">
          <time
            className="font-mono text-xs tabular-nums text-muted-foreground"
            dateTime={story.updated_at}
          >
            {new Date(story.updated_at).toLocaleString()}
          </time>
        </PropertyRow>
      </div>
    </div>
  );
}

interface PropertyRowProps {
  label: string;
  children: React.ReactNode;
}

function PropertyRow({ label, children }: PropertyRowProps): React.ReactElement {
  return (
    <div className={cn('space-y-1.5')}>
      <p className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}

export interface EpicInspectorProps {
  epic: Epic | null;
  storyCount: number;
  onClose?: () => void;
}

export function EpicInspector({
  epic,
  storyCount,
  onClose,
}: EpicInspectorProps): React.ReactElement {
  if (!epic) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Select an Epic to view details
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium text-foreground">Epic Details</h2>
        {onClose ? (
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close inspector">
            ✕
          </Button>
        ) : null}
      </div>
      <div className="space-y-6 p-4">
        <EpicBadge
          name={epic.name}
          status={getEpicStatusCategory(epic)}
          showLabel
        />
        <h3 className="text-lg font-semibold text-foreground">{epic.name}</h3>
        {epic.description_md ? (
          <p className="text-sm text-muted-foreground">{epic.description_md}</p>
        ) : null}
        <PropertyRow label="Stories">
          <span className="font-mono text-sm tabular-nums text-foreground">
            {storyCount}
          </span>
        </PropertyRow>
      </div>
    </div>
  );
}
