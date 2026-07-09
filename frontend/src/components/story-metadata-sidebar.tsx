'use client';

import * as React from 'react';
import type { Story } from '@landi-flow/core/types';
import {
  Button,
  MemberChip,
  StoryIdentifierBadge,
  cn,
} from '@landi-flow/ui';
import {
  BarChart3,
  Bot,
  Calendar,
  CircleDot,
  Copy,
  Flag,
  Link2,
  Star,
  User,
  Users,
  Workflow,
} from 'lucide-react';
import { publishStory } from '@/controllers/story-controller';
import {
  AgentDelegatePicker,
  FollowersPicker,
  OwnerPicker,
  StoryEpicPicker,
  StoryPriorityPicker,
  StoryStatusPicker,
} from '@/components/story-property-pickers';
import { StorySlaBadge } from '@/components/story-sla-badge';
import { useEpicStore } from '@/hooks/use-epic-store';
import { useStoryPropertyHandlers } from '@/hooks/use-story-property-handlers';
import { buildStoryModalQueryString } from '@/lib/story/open-story-modal';
import { DEMO_TEAM_ID } from '@/lib/seed-data';

export interface MetadataPropertyRowProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  className?: string;
}

/** Shortcut-style metadata row: icon + muted label stacked above value. */
export function MetadataPropertyRow({
  icon,
  label,
  children,
  className,
}: MetadataPropertyRowProps): React.ReactElement {
  return (
    <div className={cn('flex items-start gap-2.5 py-2', className)}>
      <span
        className="mt-0.5 flex w-5 shrink-0 items-center justify-center text-muted-foreground"
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm text-foreground">{children}</div>
      </div>
    </div>
  );
}

export interface StoryMetadataSidebarProps {
  story: Story;
  className?: string;
  /** Optional slot for modal chrome (pin / expand / close). */
  headerActions?: React.ReactNode;
}

/** Right metadata sidebar (~25% width) — Shortcut property panel parity. */
export function StoryMetadataSidebar({
  story,
  className,
  headerActions,
}: StoryMetadataSidebarProps): React.ReactElement {
  const { epics } = useEpicStore();
  const epic = epics.find((entry) => entry.id === story.epic_id) ?? null;
  const handlers = useStoryPropertyHandlers(story);

  const permalink = React.useMemo((): string => {
    if (typeof window === 'undefined') {
      return '';
    }
    const url = new URL(window.location.href);
    url.search = buildStoryModalQueryString(story);
    return url.toString();
  }, [story]);

  const handleCopyId = React.useCallback((): void => {
    void navigator.clipboard.writeText(story.identifier);
  }, [story.identifier]);

  const handleCopyPermalink = React.useCallback((): void => {
    if (!permalink) {
      return;
    }
    void navigator.clipboard.writeText(permalink);
  }, [permalink]);

  const formatDate = (iso: string | null): string => {
    if (!iso) {
      return 'No date';
    }
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <aside
      className={cn('flex h-full min-h-0 flex-col', className)}
      data-testid="story-detail-metadata"
      aria-label="Story properties"
    >
      <div className="flex shrink-0 items-start justify-between gap-2 pb-2">
        <div className="min-w-0 flex-1 space-y-1">
          <MetadataPropertyRow
            icon={<span className="font-mono text-xs">#</span>}
            label="Story ID"
          >
            <div className="flex items-center gap-1.5">
              <StoryIdentifierBadge identifier={story.identifier} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                aria-label="Copy story ID"
                onClick={handleCopyId}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </MetadataPropertyRow>
          {permalink ? (
            <MetadataPropertyRow icon={<Link2 className="h-4 w-4" />} label="Permalink">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-mono text-xs text-muted-foreground">{permalink}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 p-0"
                  aria-label="Copy permalink"
                  onClick={handleCopyPermalink}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </MetadataPropertyRow>
          ) : null}
        </div>
        {headerActions ? (
          <div className="flex shrink-0 items-center gap-0.5">{headerActions}</div>
        ) : null}
      </div>

      {story.is_draft ? (
        <div
          className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2"
          data-testid="story-draft-banner"
          data-cap="CAP-005"
        >
          <p className="text-xs text-foreground">Draft — not on the board.</p>
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          data-testid="story-detail-property-chips"
          className="space-y-0.5"
          aria-label="Story properties"
        >
          <MetadataPropertyRow icon={<Users className="h-4 w-4" />} label="Team">
            <span>Team {story.team_id === DEMO_TEAM_ID ? '1' : story.team_id.slice(0, 6)}</span>
          </MetadataPropertyRow>

          <MetadataPropertyRow icon={<Workflow className="h-4 w-4" />} label="Workflow">
            <span className="text-muted-foreground">Product Development</span>
          </MetadataPropertyRow>

          <MetadataPropertyRow icon={<CircleDot className="h-4 w-4" />} label="State">
            <StoryStatusPicker
              workflowStateId={story.workflow_state_id}
              onSelect={handlers.handleStatusChange}
            />
          </MetadataPropertyRow>

          <MetadataPropertyRow icon={<Link2 className="h-4 w-4" />} label="Project">
            <span className="text-muted-foreground">None</span>
          </MetadataPropertyRow>

          <MetadataPropertyRow icon={<Flag className="h-4 w-4" />} label="Epic">
            <StoryEpicPicker epicId={story.epic_id} onSelect={handlers.handleEpicChange} />
          </MetadataPropertyRow>

          <MetadataPropertyRow icon={<Calendar className="h-4 w-4" />} label="Iteration">
            <span className="text-muted-foreground">None</span>
          </MetadataPropertyRow>

          <MetadataPropertyRow icon={<Star className="h-4 w-4" />} label="Type">
            <span>Feature</span>
          </MetadataPropertyRow>

          <MetadataPropertyRow icon={<User className="h-4 w-4" />} label="Requester">
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
              <span className="text-muted-foreground">Unknown</span>
            )}
          </MetadataPropertyRow>

          <MetadataPropertyRow icon={<User className="h-4 w-4" />} label="Owner">
            <OwnerPicker
              members={handlers.pickerMembers}
              ownerId={story.assignee_id}
              onSelect={handlers.handleSelectOwner}
            />
          </MetadataPropertyRow>

          <MetadataPropertyRow icon={<Bot className="h-4 w-4" />} label="Agent Delegate">
            <AgentDelegatePicker
              members={handlers.pickerMembers}
              agentId={story.delegate_agent_id}
              onSelectAgent={handlers.handleSelectAgent}
            />
            {story.delegate_agent_id && handlers.delegateAttribution ? (
              <p className="mt-1 text-xs text-foreground-subtle" data-testid="delegate-attribution-badge">
                {handlers.delegateAttribution}
              </p>
            ) : null}
            {handlers.agentActivity ? (
              <p className="mt-1 text-xs text-primary" role="status">
                {handlers.agentActivity}
              </p>
            ) : null}
          </MetadataPropertyRow>

          <MetadataPropertyRow icon={<BarChart3 className="h-4 w-4" />} label="Estimate">
            <span className="text-muted-foreground">
              {story.estimate != null ? `${story.estimate} Points` : 'Unestimated'}
            </span>
          </MetadataPropertyRow>

          <MetadataPropertyRow icon={<Calendar className="h-4 w-4" />} label="Due">
            <span className="text-muted-foreground">{formatDate(story.due_date)}</span>
          </MetadataPropertyRow>

          <MetadataPropertyRow icon={<Users className="h-4 w-4" />} label="Followers">
            <FollowersPicker
              members={handlers.pickerMembers}
              followerIds={story.follower_ids}
              onChange={handlers.handleFollowersChange}
            />
          </MetadataPropertyRow>
        </div>

        <div className="mt-4 border-t border-border/60 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">Custom Fields</h4>
            <button type="button" className="text-xs text-primary hover:underline">
              Edit
            </button>
          </div>
          <div className="space-y-0.5">
            <MetadataPropertyRow icon={<Star className="h-4 w-4" />} label="Priority">
              <StoryPriorityPicker priority={story.priority} onSelect={handlers.handlePriorityChange} />
            </MetadataPropertyRow>
          </div>
        </div>

        <div className="mt-4 border-t border-border/60 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">Labels</h4>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StorySlaBadge workspaceId={story.workspace_id} story={story} />
            {epic ? (
              <span className="rounded-full bg-status-warning/20 px-2 py-0.5 text-xs text-status-warning">
                {epic.name}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 space-y-1 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <p>
            <span className="text-foreground-subtle">Created:</span>{' '}
            <time dateTime={story.created_at}>{formatDate(story.created_at)}</time>
          </p>
          <p>
            <span className="text-foreground-subtle">Last updated:</span>{' '}
            <time dateTime={story.updated_at}>{formatDate(story.updated_at)}</time>
          </p>
        </div>
      </div>
    </aside>
  );
}

/** Alias for modal context — same component, explicit export name for story detail modal. */
export const StoryModalMetadataPanel = StoryMetadataSidebar;
