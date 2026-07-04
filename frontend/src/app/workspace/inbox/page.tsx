'use client';

import * as React from 'react';
import Image from 'next/image';
import { AppShell } from '@/components/app-shell';
import { StoryListView } from '@/components/story-list-view';
import { useStoryStore } from '@/hooks/use-story-store';
import { storyStore } from '@/stores/story-store';
import { brandAssets } from '@/lib/correlation';

export default function WorkspaceInboxPage(): React.ReactElement {
  const { stories, selectedStoryId } = useStoryStore();

  return (
    <AppShell viewTitle="Inbox" breadcrumbs={['Team Design', 'Inbox']}>
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="relative hidden h-16 w-24 overflow-hidden rounded-md border border-border sm:block">
            <Image
              src={brandAssets.heroGraphic}
              alt="Landi Flow hero graphic"
              fill
              className="object-cover"
              sizes="96px"
              priority
            />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Welcome back — {stories.length} active Stories in your Workspace.
            </p>
          </div>
        </div>
      </div>
      <StoryListView
        stories={stories}
        selectedStoryId={selectedStoryId}
        onStorySelect={(id) => storyStore.selectStory(id)}
      />
    </AppShell>
  );
}
