'use client';

import * as React from 'react';
import type { Story } from '@landi-flow/core/types';
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

export interface StoryListViewProps {
  stories: Story[];
  selectedStoryId?: string | null;
  onStorySelect: (storyId: string) => void;
  onCreateStory?: () => void;
}

/** Compact Story list view (~36–40px rows) with i18n empty state. */
export function StoryListView({
  stories,
  selectedStoryId,
  onStorySelect,
  onCreateStory,
}: StoryListViewProps): React.ReactElement {
  const t = useTranslations('stories');

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
      {stories.map((story) => {
        const status = workflowStateToStatus(story.workflow_state_id);
        const isSelected = selectedStoryId === story.id;
        const hasActiveAgent = story.delegate_agent_id !== null && status === 'in_progress';

        return (
          <button
            key={story.id}
            type="button"
            role="listitem"
            onClick={() => onStorySelect(story.id)}
            className={cn(
              'flex h-10 w-full items-center gap-3 px-6 text-left transition-colors duration-100',
              'hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
              isSelected ? 'bg-white/10' : '',
            )}
            aria-current={isSelected ? 'true' : undefined}
          >
            <StoryIdentifierBadge identifier={story.identifier} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {story.title}
            </span>
            <StoryPriorityBadge priority={story.priority} />
            {story.delegate_agent_id ? (
              <Avatar
                actorType="agent"
                size="sm"
                active={hasActiveAgent}
                aria-label={`Agent ${story.delegate_agent_id}${hasActiveAgent ? ' (active)' : ''}`}
              >
                <AvatarFallback actorType="agent">AI</AvatarFallback>
              </Avatar>
            ) : story.assignee_id ? (
              <Avatar
                actorType="human"
                size="sm"
                aria-label={`Assignee ${story.assignee_id}`}
              >
                <AvatarFallback actorType="human">
                  {story.assignee_id.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
