'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { DescriptionEditor } from '@/components/description-editor';
import { StoryListView } from '@/components/story-list-view';
import { EpicBadge } from '@landi-flow/ui';
import { useEpicStore } from '@/hooks/use-epic-store';
import { useStoryStore } from '@/hooks/use-story-store';
import { epicStore } from '@/stores/epic-store';
import { storyStore } from '@/stores/story-store';
import { getEpicById } from '@/lib/seed-data';
import { getEpicStatusCategory } from '@/lib/epic-status';

export default function EpicDetailPage(): React.ReactElement {
  const params = useParams<{ epicId: string }>();
  const epicId = params.epicId;
  const { epics } = useEpicStore();
  const { stories, selectedStoryId } = useStoryStore();

  const epic = epics.find((e) => e.id === epicId) ?? getEpicById(epicId);
  const epicStories = stories.filter((story) => story.epic_id === epicId);

  React.useEffect(() => {
    if (epicId) {
      epicStore.selectEpic(epicId);
    }
  }, [epicId]);

  const handleDescriptionChange = React.useCallback(
    (markdown: string) => {
      if (epicId) {
        epicStore.updateEpicDescription(epicId, markdown);
      }
    },
    [epicId],
  );

  if (!epic) {
    return (
      <AppShell viewTitle="Epic not found" breadcrumbs={['Team Design', 'Epics']}>
        <p className="p-6 text-sm text-muted-foreground">Epic not found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      viewTitle={epic.name}
      breadcrumbs={['Team Design', 'Epics', epic.name]}
    >
      <div className="border-b border-border px-6 py-4">
        <EpicBadge
          name={epic.name}
          status={getEpicStatusCategory(epic)}
          showLabel
        />
        <DescriptionEditor
          workspaceId={epic.workspace_id}
          entityType="epic"
          entityId={epic.id}
          value={epic.description_md}
          onChange={handleDescriptionChange}
          placeholder="Describe the Epic — type **markdown** or paste a spec…"
          className="mt-4 max-w-3xl"
          label="Epic description"
        />
      </div>
      <StoryListView
        stories={epicStories}
        selectedStoryId={selectedStoryId}
        onStorySelect={(id) => storyStore.selectStory(id)}
      />
    </AppShell>
  );
}
