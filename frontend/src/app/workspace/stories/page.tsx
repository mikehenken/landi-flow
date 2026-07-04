'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { StoryListView } from '@/components/story-list-view';
import { useStoryStore } from '@/hooks/use-story-store';
import { storyStore } from '@/stores/story-store';

export default function StoriesPage(): React.ReactElement {
  const { stories, selectedStoryId } = useStoryStore();

  return (
    <AppShell viewTitle="Stories" breadcrumbs={['Team Design', 'Stories']}>
      <StoryListView
        stories={stories}
        selectedStoryId={selectedStoryId}
        onStorySelect={(id) => storyStore.selectStory(id)}
      />
    </AppShell>
  );
}
