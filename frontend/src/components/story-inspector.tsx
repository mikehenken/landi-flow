'use client';

import * as React from 'react';
import type { Epic, Story } from '@landi-flow/core/types';
import {
  AssigneePicker,
  Badge,
  Button,
  EpicBadge,
  StoryIdentifierBadge,
  StoryPriorityBadge,
  cn,
} from '@landi-flow/ui';
import { DescriptionEditor } from '@/components/description-editor';
import { getEpicById } from '@/lib/seed-data';
import { getEpicStatusCategory } from '@/lib/epic-status';
import { workflowStateToStatus } from '@/lib/workflow-states';
import { epicStore } from '@/stores/epic-store';
import { storyStore } from '@/stores/story-store';
import { PICKER_MEMBERS, getAgentName } from '@/lib/workspace-members';
import { assignAndActRequest } from '@/lib/agents/assign-client';

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

  return (
    <StoryInspectorContent story={story} epic={epicProp} onClose={onClose} />
  );
}

function StoryInspectorContent({
  story,
  epic: epicProp,
  onClose,
}: {
  story: Story;
  epic?: Epic | null;
  onClose?: () => void;
}): React.ReactElement {
  const epic = epicProp ?? (story.epic_id ? getEpicById(story.epic_id) : null);
  const status = workflowStateToStatus(story.workflow_state_id);
  const [agentActivity, setAgentActivity] = React.useState<string | null>(null);

  const handleDescriptionChange = React.useCallback(
    (markdown: string) => {
      storyStore.updateStoryDescription(story.id, markdown);
    },
    [story.id],
  );

  const handleSelectHuman = React.useCallback(
    (userId: string | null) => {
      storyStore.assignStory(story.id, { assigneeId: userId });
      void assignAndActRequest({
        entity: 'story',
        entityId: story.id,
        workspaceId: story.workspace_id,
        humanId: userId,
        entityLabel: story.identifier,
      });
    },
    [story.id, story.workspace_id, story.identifier],
  );

  const handleSelectAgent = React.useCallback(
    (agentId: string | null) => {
      storyStore.assignStory(story.id, { delegateAgentId: agentId });
      if (agentId) {
        setAgentActivity(`${getAgentName(agentId)} is acting via the Action Bus…`);
      } else {
        setAgentActivity(null);
      }
      void assignAndActRequest({
        entity: 'story',
        entityId: story.id,
        workspaceId: story.workspace_id,
        delegateAgentId: agentId,
        entityLabel: story.identifier,
      }).then((result) => {
        if (!agentId) {
          return;
        }
        setAgentActivity(
          result.ok
            ? `${getAgentName(agentId)} picked up ${story.identifier}${result.live ? '' : ' (mock Action Bus)'}`
            : `Assignment failed: ${result.errorText ?? 'unknown error'}`,
        );
      });
    },
    [story.id, story.workspace_id, story.identifier],
  );

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
          <DescriptionEditor
            workspaceId={story.workspace_id}
            entityType="story"
            entityId={story.id}
            value={story.description_md}
            onChange={handleDescriptionChange}
            placeholder="Add acceptance criteria — paste markdown instantly…"
            variant="compact"
            className="mt-3"
            label="Description"
          />
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

        <PropertyRow label="Assignee">
          <AssigneePicker
            members={PICKER_MEMBERS}
            humanId={story.assignee_id}
            agentId={story.delegate_agent_id}
            humanLabel="Assignee"
            onSelectHuman={handleSelectHuman}
            onSelectAgent={handleSelectAgent}
          />
          {story.delegate_agent_id ? (
            <p className="mt-1.5 text-xs text-foreground-subtle">
              {getAgentName(story.delegate_agent_id)} acts on behalf of the assignee.
            </p>
          ) : null}
          {agentActivity ? (
            <p className="mt-1 text-xs text-primary" role="status">
              {agentActivity}
            </p>
          ) : null}
        </PropertyRow>

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
    <EpicInspectorContent epic={epic} storyCount={storyCount} onClose={onClose} />
  );
}

function EpicInspectorContent({
  epic,
  storyCount,
  onClose,
}: {
  epic: Epic;
  storyCount: number;
  onClose?: () => void;
}): React.ReactElement {
  const [agentActivity, setAgentActivity] = React.useState<string | null>(null);

  const handleDescriptionChange = React.useCallback(
    (markdown: string) => {
      epicStore.updateEpicDescription(epic.id, markdown);
    },
    [epic.id],
  );

  const handleSelectLead = React.useCallback(
    (userId: string | null) => {
      epicStore.assignEpic(epic.id, { leadId: userId });
      void assignAndActRequest({
        entity: 'epic',
        entityId: epic.id,
        workspaceId: epic.workspace_id,
        humanId: userId,
        entityLabel: epic.name,
      });
    },
    [epic.id, epic.workspace_id, epic.name],
  );

  const handleSelectAgent = React.useCallback(
    (agentId: string | null) => {
      epicStore.assignEpic(epic.id, { delegateAgentId: agentId });
      if (agentId) {
        setAgentActivity(`${getAgentName(agentId)} is acting via the Action Bus…`);
      } else {
        setAgentActivity(null);
      }
      void assignAndActRequest({
        entity: 'epic',
        entityId: epic.id,
        workspaceId: epic.workspace_id,
        delegateAgentId: agentId,
        entityLabel: epic.name,
      }).then((result) => {
        if (!agentId) {
          return;
        }
        setAgentActivity(
          result.ok
            ? `${getAgentName(agentId)} picked up “${epic.name}”${result.live ? '' : ' (mock Action Bus)'}`
            : `Assignment failed: ${result.errorText ?? 'unknown error'}`,
        );
      });
    },
    [epic.id, epic.workspace_id, epic.name],
  );

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
        <DescriptionEditor
          workspaceId={epic.workspace_id}
          entityType="epic"
          entityId={epic.id}
          value={epic.description_md}
          onChange={handleDescriptionChange}
          placeholder="Epic scope and goals…"
          variant="compact"
          label="Description"
        />
        <PropertyRow label="Lead / Agent">
          <AssigneePicker
            members={PICKER_MEMBERS}
            humanId={epic.lead_id}
            agentId={epic.delegate_agent_id}
            humanLabel="Lead"
            onSelectHuman={handleSelectLead}
            onSelectAgent={handleSelectAgent}
          />
          {epic.delegate_agent_id ? (
            <p className="mt-1.5 text-xs text-foreground-subtle">
              {getAgentName(epic.delegate_agent_id)} is driving this Epic.
            </p>
          ) : null}
          {agentActivity ? (
            <p className="mt-1 text-xs text-primary" role="status">
              {agentActivity}
            </p>
          ) : null}
        </PropertyRow>
        <PropertyRow label="Stories">
          <span className="font-mono text-sm tabular-nums text-foreground">
            {storyCount}
          </span>
        </PropertyRow>
      </div>
    </div>
  );
}
