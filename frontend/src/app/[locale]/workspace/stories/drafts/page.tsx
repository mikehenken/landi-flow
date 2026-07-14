'use client';

import * as React from 'react';
import type { Story } from '@landi-flow/core/types';
import { Button } from '@landi-flow/ui';
import { AppShell } from '@/components/app-shell';
import { StoryListView } from '@/components/story-list-view';
import { useDefaultTeamLabel } from '@/hooks/use-default-team-label';
import { useStoryStore } from '@/hooks/use-story-store';
import { publishStory } from '@/controllers/story-controller';
import { useWorkspace } from '@/lib/workspace';
import { useStoryDeepLink, useStoryModalSelect } from '@/lib/story/use-story-deep-link';

/** Drafts library — unpublished stories. */
export default function StoryDraftsPage(): React.ReactElement {
  const { workspace } = useWorkspace();
  const { stories, selectedStoryId } = useStoryStore();
  const teamLabel = useDefaultTeamLabel();
  const handleStorySelect = useStoryModalSelect();
  useStoryDeepLink();
  const drafts = React.useMemo(
    () => stories.filter((story) => story.is_draft),
    [stories],
  );

  const handlePublish = (story: Story): void => {
    void publishStory(workspace.id, story);
  };

  return (
    <AppShell viewTitle="Drafts" breadcrumbs={[teamLabel, 'Stories', 'Drafts']}>
      <div
        className="flex h-full min-h-0 flex-col"
        data-testid="story-drafts-view"
        data-cap="CAP-005"
      >
        {drafts.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No drafts — create a Story and save as draft.
          </p>
        ) : (
          <>
            <div className="border-b border-border px-6 py-3">
              <p className="text-sm text-muted-foreground">
                {drafts.length} draft{drafts.length === 1 ? '' : 's'} — publish to add to the team
                board.
              </p>
            </div>
            <StoryListView
              stories={drafts}
              selectedStoryId={selectedStoryId}
              onStorySelect={handleStorySelect}
              enableDragReorder={false}
              enableBulkSelect={false}
            />
            {selectedStoryId ? (
              <div className="border-t border-border px-6 py-3">
                <Button
                  type="button"
                  size="sm"
                  data-testid="drafts-publish-selected"
                  onClick={() => {
                    const story = drafts.find((entry) => entry.id === selectedStoryId);
                    if (story) {
                      handlePublish(story);
                    }
                  }}
                >
                  Publish selected draft
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
