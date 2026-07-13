'use client';

import * as React from 'react';
import type { Story, StoryDisplayProperty } from '@landi-flow/core/types';
import {
  Avatar,
  AvatarFallback,
  StoryIdentifierBadge,
  StoryPriorityBadge,
  cn,
  useTranslations,
} from '@landi-flow/ui';
import { workflowStateToStatus } from '@/lib/workflow-states';
import { brandAssets } from '@/lib/correlation';
import { EmptyState } from '@/components/empty-state';
import { getParentStoryId, getStoryCustomerId } from '@/lib/story-relations-seed';
import { useAssignableMembers } from '@/hooks/use-assignable-members';
import { useStorySelection } from '@/hooks/use-story-selection';
import {
  formatAssigneeDisplayName,
  formatAssigneeInitials,
} from '@/lib/assignee-display';
import { useWorkspace } from '@/lib/workspace';
import { updateStorySortOrder } from '@/controllers/story-controller';
import { StoryListSkeleton } from '@/components/workspace-content-skeleton';

export interface StoryListViewProps {
  stories: Story[];
  selectedStoryId?: string | null;
  onStorySelect: (storyId: string) => void;
  onCreateStory?: () => void;
  displayProperties?: StoryDisplayProperty[];
  enableDragReorder?: boolean;
  loading?: boolean;
}

/** Compact Story list view with multi-select, drag reorder, and display properties (CAP-032/033). */
export function StoryListView({
  stories,
  selectedStoryId,
  onStorySelect,
  onCreateStory,
  displayProperties = ['id', 'status', 'assignee', 'priority'],
  enableDragReorder = true,
  loading = false,
}: StoryListViewProps): React.ReactElement {
  const t = useTranslations('stories');
  const { workspace } = useWorkspace();
  const { getMemberById } = useAssignableMembers();
  const { isSelected, toggle, selectRange } = useStorySelection();
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);

  const orderedIds = React.useMemo(() => stories.map((story) => story.id), [stories]);

  const showProperty = (property: StoryDisplayProperty): boolean =>
    displayProperties.includes(property);

  if (loading) {
    return <StoryListSkeleton />;
  }

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, index: number): void => {
    if (!enableDragReorder) {
      return;
    }
    setDragIndex(index);
    event.dataTransfer.setData('application/landi-list', String(index));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, toIndex: number): void => {
    event.preventDefault();
    if (!enableDragReorder) {
      return;
    }
    const raw = event.dataTransfer.getData('application/landi-list');
    const fromIndex = raw ? Number.parseInt(raw, 10) : dragIndex;
    if (fromIndex === null || Number.isNaN(fromIndex) || fromIndex === toIndex) {
      setDragIndex(null);
      return;
    }

    const reordered = [...stories];
    const [moved] = reordered.splice(fromIndex, 1);
    if (!moved) {
      setDragIndex(null);
      return;
    }
    reordered.splice(toIndex, 0, moved);

    reordered.forEach((story, index) => {
      void updateStorySortOrder(workspace.id, story, (index + 1) * 1000);
    });
    setDragIndex(null);
  };

  if (stories.length === 0) {
    return (
      <EmptyState
        heading={t('empty.heading')}
        description={t('empty.description')}
        ctaLabel={t('empty.cta')}
        onCtaClick={onCreateStory}
        imageSrc={brandAssets.featureCollaboration}
        imageAlt={t('badge.label')}
      />
    );
  }

  return (
    <div className="divide-y divide-border-subtle" role="list" aria-label={t('badge.label')}>
      {stories.map((story, index) => {
        const status = workflowStateToStatus(story.workflow_state_id);
        const isRowSelected = selectedStoryId === story.id;
        const isBulkSelected = isSelected(story.id);
        const hasActiveAgent = story.delegate_agent_id !== null && status === 'in_progress';
        const isSubStory = getParentStoryId(story.id) !== null;
        const customerId = getStoryCustomerId(story.id);
        const assigneeMember = story.assignee_id ? getMemberById(story.assignee_id) : undefined;
        const assigneeLabel = formatAssigneeDisplayName(assigneeMember, story.assignee_id);
        const assigneeInitials = formatAssigneeInitials(assigneeMember, story.assignee_id);
        const delegateMember = story.delegate_agent_id
          ? getMemberById(story.delegate_agent_id)
          : undefined;
        const delegateLabel = formatAssigneeDisplayName(
          delegateMember,
          story.delegate_agent_id,
        );

        return (
          <div
            key={story.id}
            draggable={enableDragReorder}
            onDragStart={(event) => handleDragStart(event, index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, index)}
            className={cn(isSubStory ? 'ps-6' : '')}
          >
            <div
              className={cn(
                'flex h-10 w-full items-center gap-2 px-4 text-left transition-colors duration-100 sm:gap-3 sm:px-6',
                isBulkSelected ? 'bg-primary/10' : isRowSelected ? 'bg-white/10' : 'hover:bg-white/5',
              )}
            >
              <input
                type="checkbox"
                checked={isBulkSelected}
                onChange={(event) => {
                  event.stopPropagation();
                  if (event.nativeEvent instanceof MouseEvent && event.nativeEvent.shiftKey) {
                    selectRange(story.id, orderedIds);
                    return;
                  }
                  toggle(story.id);
                }}
                aria-label={`Select ${story.identifier}`}
                data-testid="story-list-select"
                className="h-3.5 w-3.5 shrink-0"
              />
              <button
                type="button"
                data-testid="story-list-item"
                role="listitem"
                onClick={() => onStorySelect(story.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:gap-3"
                aria-current={isRowSelected ? 'true' : undefined}
              >
                {showProperty('id') ? <StoryIdentifierBadge identifier={story.identifier} /> : null}
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {story.title}
                </span>
                {showProperty('status') ? (
                  <span className="hidden text-xs capitalize text-muted-foreground sm:inline">
                    {status.replace('_', ' ')}
                  </span>
                ) : null}
                {showProperty('priority') ? <StoryPriorityBadge priority={story.priority} /> : null}
                {showProperty('customer') && customerId ? (
                  <span className="hidden text-xs text-muted-foreground md:inline">{customerId}</span>
                ) : null}
                {showProperty('assignee') && story.delegate_agent_id ? (
                  <Avatar
                    actorType="agent"
                    size="sm"
                    active={hasActiveAgent}
                    aria-label={`Agent ${delegateLabel}${hasActiveAgent ? ' (active)' : ''}`}
                  >
                    <AvatarFallback actorType="agent">AI</AvatarFallback>
                  </Avatar>
                ) : showProperty('assignee') && story.assignee_id ? (
                  <Avatar
                    actorType="human"
                    size="sm"
                    aria-label={`Assignee ${assigneeLabel}`}
                  >
                    <AvatarFallback actorType="human">{assigneeInitials}</AvatarFallback>
                  </Avatar>
                ) : null}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
