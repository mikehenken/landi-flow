'use client';

import * as React from 'react';
import type { Epic, Story } from '@landi-flow/core/types';
import {
  AssigneePicker,
  Button,
  EpicBadge,
  MemberChip,
  StoryIdentifierBadge,
  cn,
} from '@landi-flow/ui';
import { DescriptionEditor } from '@/components/description-editor';
import {
  AgentDelegatePicker,
  FollowersPicker,
  OwnerPicker,
  StoryEpicPicker,
  StoryPriorityPicker,
  StoryStatusPicker,
} from '@/components/story-property-pickers';
import {
  updateEpicDelegateAgent,
  updateEpicDescription,
  updateEpicLead,
} from '@/controllers/epic-controller';
import {
  StoryAttachmentsPanel,
} from '@/components/story-lifecycle/story-attachments-panel';
import { StoryHistoryPanel } from '@/components/story-lifecycle/story-history-panel';
import { StorySignalsPanel } from '@/components/story-lifecycle/story-signals-panel';
import { StoryRelationsPanel } from '@/components/story-lifecycle/story-relations-panel';
import { SubStoriesList } from '@/components/story-lifecycle/sub-story-progress';
import { StorySlaBadge } from '@/components/story-sla-badge';
import { publishStory } from '@/controllers/story-controller';
import { useStoryPropertyHandlers } from '@/hooks/use-story-property-handlers';
import { useTeamWorkflowStates } from '@/hooks/use-team-workflow-states';
import { useAssignableMembers } from '@/hooks/use-assignable-members';
import { useStoryStore } from '@/hooks/use-story-store';
import { getDelegateAttributionLabel } from '@/lib/agents/roster-client';
import { assignAndActRequest } from '@/lib/agents/assign-client';
import { getEpicStatusCategory } from '@/lib/epic-status';
import { useWorkspace } from '@/lib/workspace';
import { storyStore } from '@/stores/story-store';

/** Matches create-story-modal description field styling (CAP-004 / task-09p). */
const STORY_DESCRIPTION_EDITOR_CLASS =
  'min-h-[120px] rounded-md border border-border bg-white/5 px-3 py-2';

export type StoryInspectorLayout = 'inspector' | 'detail';

export interface StoryInspectorProps {
  story: Story | null;
  epic?: Epic | null;
  onClose?: () => void;
  layout?: StoryInspectorLayout;
  /** When true, description editor skips nested CollaborativeRoom (parent provides room). */
  embeddedCollaboration?: boolean;
  /** When true, parent shell renders the header row (title + hide toggle). */
  suppressHeader?: boolean;
}

/** Right properties panel (280px) for selected Story metadata. */
export function StoryInspector({
  story,
  epic: epicProp,
  onClose,
  layout = 'inspector',
  embeddedCollaboration = false,
  suppressHeader = false,
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
    <StoryInspectorContent
      story={story}
      epic={epicProp}
      onClose={onClose}
      layout={layout}
      embeddedCollaboration={embeddedCollaboration}
      suppressHeader={suppressHeader}
    />
  );
}

function StoryInspectorContent({
  story,
  onClose,
  layout,
  embeddedCollaboration,
  suppressHeader,
}: {
  story: Story;
  epic?: Epic | null;
  onClose?: () => void;
  layout: StoryInspectorLayout;
  embeddedCollaboration: boolean;
  suppressHeader: boolean;
}): React.ReactElement {
  const [localHighlightedSignalId, setLocalHighlightedSignalId] = React.useState<string | null>(
    null,
  );
  const { detailFocus } = useStoryStore();
  const highlightedSignalId =
    detailFocus.highlightedSignalId ?? localHighlightedSignalId;
  const handlers = useStoryPropertyHandlers(story);
  const { workspace } = useWorkspace();
  const { workflowStates } = useTeamWorkflowStates(workspace.id, story.team_id);

  return (
    <div
      className={cn(
        'flex flex-col',
        layout === 'inspector' ? 'h-full overflow-y-auto' : undefined,
      )}
    >
      {layout === 'inspector' && !suppressHeader ? (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">Properties</h2>
          {onClose ? (
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close inspector">
              ✕
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className={cn('space-y-6', layout === 'inspector' && 'p-4')}>
        {story.is_draft ? (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2"
            data-testid="story-draft-banner"
            data-cap="CAP-005"
          >
            <p className="text-sm text-foreground">This Story is a draft — not visible on the team board.</p>
            <Button
              type="button"
              size="sm"
              data-testid="story-publish-button"
              onClick={() => void publishStory(story.workspace_id, story)}
            >
              Publish
            </Button>
          </div>
        ) : null}

        <section>
          {layout === 'inspector' ? (
            <>
              <StoryIdentifierBadge identifier={story.identifier} />
              <h3 className="text-lg font-semibold leading-snug text-foreground">
                {story.title}
              </h3>
              <StorySlaBadge workspaceId={story.workspace_id} story={story} />
            </>
          ) : null}
          <DescriptionEditor
            workspaceId={story.workspace_id}
            entityType="story"
            entityId={story.id}
            value={story.description_md}
            onChange={handlers.handleDescriptionChange}
            placeholder="Add acceptance criteria — paste markdown instantly…"
            variant="default"
            sectionClassName={layout === 'detail' ? undefined : 'mt-3'}
            editorClassName={STORY_DESCRIPTION_EDITOR_CLASS}
            showLabel={layout !== 'detail'}
            embeddedCollaboration={embeddedCollaboration}
          />
        </section>

        {layout === 'inspector' ? (
          <>
            <PropertyRow label="Status">
              <StoryStatusPicker
                workflowStateId={story.workflow_state_id}
                workflowStates={workflowStates}
                onSelect={handlers.handleStatusChange}
              />
            </PropertyRow>

            <PropertyRow label="Priority">
              <StoryPriorityPicker priority={story.priority} onSelect={handlers.handlePriorityChange} />
            </PropertyRow>

            <PropertyRow label="Epic">
              <StoryEpicPicker epicId={story.epic_id} onSelect={handlers.handleEpicChange} />
            </PropertyRow>
          </>
        ) : null}

        <PropertyRow label="Owner">
          <OwnerPicker
            members={handlers.pickerMembers}
            ownerId={story.assignee_id}
            onSelect={handlers.handleSelectOwner}
          />
        </PropertyRow>

        <PropertyRow label="Requester">
          {handlers.requester ? (
            <MemberChip
              member={{
                kind: handlers.requester.kind,
                id: handlers.requester.id,
                name: handlers.requester.name,
                avatar_url: handlers.requester.avatar_url,
                presence: handlers.requester.presence,
                subtitle: handlers.requester.subtitle,
                runtime: handlers.requester.runtime ?? undefined,
              }}
            />
          ) : (
            <span className="text-sm text-muted-foreground">Unknown</span>
          )}
        </PropertyRow>

        <PropertyRow label="Followers">
          <FollowersPicker
            members={handlers.pickerMembers}
            followerIds={story.follower_ids}
            onChange={handlers.handleFollowersChange}
          />
        </PropertyRow>

        <PropertyRow label="Agent delegate">
          <AgentDelegatePicker
            members={handlers.pickerMembers}
            agentId={story.delegate_agent_id}
            onSelectAgent={handlers.handleSelectAgent}
          />
          {story.delegate_agent_id && handlers.delegateAttribution ? (
            <p className="mt-1.5 text-xs text-foreground-subtle" data-testid="delegate-attribution-badge">
              {handlers.delegateMember?.runtime === 'attribution_only' ? (
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-primary">
                  {handlers.delegateAttribution}
                </span>
              ) : handlers.delegateMember?.runtime === 'external_mcp' &&
                handlers.delegateMember.connection_state === 'connected' ? (
                <span className="rounded bg-status-inProgress/10 px-1.5 py-0.5 text-status-inProgress">
                  Active delegate — acts via MCP
                </span>
              ) : (
                handlers.delegateAttribution
              )}
            </p>
          ) : null}
          {handlers.agentActivity ? (
            <p className="mt-1 text-xs text-primary" role="status">
              {handlers.agentActivity}
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

        <SubStoriesList parentStory={story} />
        <StoryRelationsPanel story={story} />
        <StoryAttachmentsPanel story={story} />
        <StorySignalsPanel
          story={story}
          highlightedSignalId={highlightedSignalId}
          activity={handlers.storyActivity.activity}
          loading={handlers.storyActivity.loading}
          error={handlers.storyActivity.error}
          onRetry={handlers.storyActivity.reload}
        />
        <StoryHistoryPanel
          story={story}
          activity={handlers.storyActivity.activity}
          loading={handlers.storyActivity.loading}
          error={handlers.storyActivity.error}
          onRetry={handlers.storyActivity.reload}
          onSignalSelect={(activityEventId) => {
            setLocalHighlightedSignalId(activityEventId);
            storyStore.setDetailFocus({
              section: 'signals',
              highlightedSignalId: activityEventId,
            });
          }}
        />
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
  /** When true, parent shell renders the header row (title + hide toggle). */
  suppressHeader?: boolean;
}

export function EpicInspector({
  epic,
  storyCount,
  onClose,
  suppressHeader = false,
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
    <EpicInspectorContent
      epic={epic}
      storyCount={storyCount}
      onClose={onClose}
      suppressHeader={suppressHeader}
    />
  );
}

function EpicInspectorContent({
  epic,
  storyCount,
  onClose,
  suppressHeader,
}: {
  epic: Epic;
  storyCount: number;
  onClose?: () => void;
  suppressHeader: boolean;
}): React.ReactElement {
  const [agentActivity, setAgentActivity] = React.useState<string | null>(null);
  const { pickerMembers, getAgentName, getMemberById } = useAssignableMembers();
  const delegateMember = getMemberById(epic.delegate_agent_id);
  const delegateAttribution = getDelegateAttributionLabel(delegateMember);

  const handleDescriptionChange = React.useCallback(
    (markdown: string) => {
      void updateEpicDescription(epic.workspace_id, epic, markdown);
    },
    [epic],
  );

  const handleSelectLead = React.useCallback(
    (userId: string | null) => {
      void updateEpicLead(epic.workspace_id, epic, userId);
      void assignAndActRequest({
        entity: 'epic',
        entityId: epic.id,
        workspaceId: epic.workspace_id,
        humanId: userId,
        entityLabel: epic.name,
      });
    },
    [epic],
  );

  const handleSelectAgent = React.useCallback(
    (agentId: string | null) => {
      void updateEpicDelegateAgent(epic.workspace_id, epic, agentId);
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
    [epic, getAgentName],
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {!suppressHeader ? (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">Epic Details</h2>
          {onClose ? (
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close inspector">
              ✕
            </Button>
          ) : null}
        </div>
      ) : null}
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
            members={pickerMembers}
            humanId={epic.lead_id}
            agentId={epic.delegate_agent_id}
            humanLabel="Lead"
            onSelectHuman={handleSelectLead}
            onSelectAgent={handleSelectAgent}
          />
          {epic.delegate_agent_id && delegateAttribution ? (
            <p className="mt-1.5 text-xs text-foreground-subtle" data-testid="epic-delegate-attribution-badge">
              {delegateMember?.runtime === 'attribution_only' ? (
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-primary">
                  {delegateAttribution}
                </span>
              ) : delegateMember?.runtime === 'external_mcp' &&
                delegateMember.connection_state === 'connected' ? (
                <span className="rounded bg-status-inProgress/10 px-1.5 py-0.5 text-status-inProgress">
                  Active delegate
                </span>
              ) : (
                delegateAttribution
              )}
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
