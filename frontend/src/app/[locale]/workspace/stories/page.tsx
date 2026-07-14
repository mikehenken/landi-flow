'use client';

import * as React from 'react';
import { useTranslations } from '@landi-flow/ui';
import { AppShell } from '@/components/app-shell';
import { useOpenCreateStoryModal } from '@/components/create-story-modal';
import { StoryListView } from '@/components/story-list-view';
import { StoryDetailSurface } from '@/components/story-detail-panel';
import {
  StoriesViewProvider,
  useStoriesViewContext,
} from '@/components/stories-view-provider';
import { useDefaultTeamLabel } from '@/hooks/use-default-team-label';
import { useStoryStore } from '@/hooks/use-story-store';
import { useSelectedStoryId } from '@/hooks/use-selected-story-id';
import { useStoryDeepLink, useStoryModalSelect } from '@/lib/story/use-story-deep-link';
import { storyStore } from '@/stores/story-store';

function StoriesListBody(): React.ReactElement {
  const openCreateStory = useOpenCreateStoryModal();
  const { loading, stories } = useStoryStore();
  const selectedStoryId = useSelectedStoryId();
  const { visibleStories, displayProperties } = useStoriesViewContext();
  useStoryDeepLink();
  const handleStorySelect = useStoryModalSelect();

  const selectedStory =
    (selectedStoryId
      ? visibleStories.find(
          (story) => story.id === selectedStoryId || story.identifier === selectedStoryId,
        ) ??
        stories.find(
          (story) => story.id === selectedStoryId || story.identifier === selectedStoryId,
        ) ??
        null
      : null);

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <StoryListView
            stories={visibleStories}
            selectedStoryId={selectedStoryId}
            loading={loading}
            onStorySelect={handleStorySelect}
            onCreateStory={openCreateStory}
            displayProperties={displayProperties}
          />
        </div>
      </div>
      <StoryDetailSurface story={selectedStory} onClose={() => storyStore.selectStory(null)} />
    </div>
  );
}

export default function StoriesPage(): React.ReactElement {
  const t = useTranslations('navigation');
  const { stories } = useStoryStore();
  const teamLabel = useDefaultTeamLabel(t('inbox.team_breadcrumb'));

  return (
    <AppShell
      viewTitle={t('stories.title')}
      breadcrumbs={[teamLabel, t('stories.title')]}
    >
      <StoriesViewProvider stories={stories} layout="list">
        <StoriesListBody />
      </StoriesViewProvider>
    </AppShell>
  );
}
