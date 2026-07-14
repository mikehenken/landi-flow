'use client';

import * as React from 'react';
import type { Epic } from '@landi-flow/core/types';
import { StoryListView } from '@/components/story-list-view';
import { listEpicAttachedViews } from '@/lib/epic-surfaces/epic-surfaces-store';
import { listSavedViews } from '@/lib/views/saved-views-store';
import { useStoryStore } from '@/hooks/use-story-store';
import { useStoryModalSelect } from '@/lib/story/use-story-deep-link';

export interface EpicAttachedViewsTabProps {
  epic: Epic;
}

/** CAP-046 — attached saved views render as epic tabs. */
export function EpicAttachedViewsTab({ epic }: EpicAttachedViewsTabProps): React.ReactElement {
  const { stories, selectedStoryId } = useStoryStore();
  const attached = listEpicAttachedViews(epic.id);
  const allViews = listSavedViews();
  const [activeViewId, setActiveViewId] = React.useState(
    attached[0]?.view_id ?? allViews[0]?.id ?? null,
  );
  const handleStorySelect = useStoryModalSelect();

  const activeView = allViews.find((view) => view.id === activeViewId);
  const epicStories = stories.filter((story) => story.epic_id === epic.id && !story.is_draft);

  return (
    <div className="p-6" data-testid="epic-attached-views-tab" data-cap="CAP-046">
      <div className="mb-4 flex gap-1">
        {attached.map((link) => {
          const view = allViews.find((row) => row.id === link.view_id);
          if (!view) {
            return null;
          }
          return (
            <button
              key={link.id}
              type="button"
              className={`rounded-md px-2 py-1 text-xs ${
                activeViewId === view.id ? 'bg-primary text-primary-foreground' : 'bg-white/5'
              }`}
              onClick={() => setActiveViewId(view.id)}
              data-testid="epic-attached-view-tab"
            >
              {view.name}
            </button>
          );
        })}
      </div>
      {activeView ? (
        <StoryListView
          stories={epicStories}
          selectedStoryId={selectedStoryId}
          onStorySelect={handleStorySelect}
          enableBulkSelect={false}
          enableDragReorder={false}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No attached views.</p>
      )}
    </div>
  );
}
