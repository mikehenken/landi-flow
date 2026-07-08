'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { BoardToolbar } from '@/components/board-toolbar';
import { CollaborativeBoard } from '@/components/collaboration';
import { StoryDetailSidebarPanel } from '@/components/story-detail-panel';
import {
  StoriesViewProvider,
  useStoriesViewContext,
} from '@/components/stories-view-provider';
import { BoardColumnControls } from '@/components/views/board-column-controls';
import { useBoardGroupByPreference } from '@/hooks/use-board-group-by-preference';
import { useEpicStore } from '@/hooks/use-epic-store';
import { useStoryStore } from '@/hooks/use-story-store';
import { storyStore } from '@/stores/story-store';
import { useWorkspace } from '@/lib/workspace';
import { isMockAuthEnabled } from '@/lib/api/config';
import {
  getDefaultTeamId,
  getWorkflowStatesForTeam,
} from '@/lib/api/workspace-context';
import { readHiddenColumnIds } from '@/lib/views/board-column-preferences';
import { createStory as persistCreateStory } from '@/controllers/story-controller';
import {
  DEMO_CYCLES,
  DEMO_TEAM_ID,
  DEMO_WORKFLOW_STATE_ROWS,
} from '@/lib/seed-data';

function StoriesBoardBody(): React.ReactElement {
  const { workspace } = useWorkspace();
  const { selectedStoryId } = useStoryStore();
  const { epics } = useEpicStore();
  const { visibleStories } = useStoriesViewContext();
  const { groupBy, setGroupBy } = useBoardGroupByPreference();
  const teamId = isMockAuthEnabled() ? DEMO_TEAM_ID : getDefaultTeamId() ?? DEMO_TEAM_ID;
  const workflowStates = isMockAuthEnabled()
    ? DEMO_WORKFLOW_STATE_ROWS
    : getWorkflowStatesForTeam();
  const cycles = DEMO_CYCLES;
  const [hiddenColumnIds, setHiddenColumnIds] = React.useState<Set<string>>(() =>
    readHiddenColumnIds(teamId),
  );
  const selectedStory =
    visibleStories.find((story) => story.id === selectedStoryId) ??
    storyStore.getServerSnapshot().stories.find((story) => story.id === selectedStoryId) ??
    null;

  const storyTitles = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const story of visibleStories) {
      map[story.id] = story.title;
    }
    return map;
  }, [visibleStories]);

  const handleCardSelect = React.useCallback((id: string) => {
    storyStore.selectStory(id);
  }, []);

  const handleQuickAdd = React.useCallback(
    (workflowStateId: string) => {
      void persistCreateStory({
        title: 'New Story',
        workspaceId: workspace.id,
        teamId,
        workflowStateId,
      });
    },
    [workspace.id, teamId],
  );

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <BoardToolbar
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          storyCount={visibleStories.length}
        />
        {groupBy === 'none' ? (
          <BoardColumnControls
            teamId={teamId}
            workflowStates={workflowStates.length > 0 ? workflowStates : DEMO_WORKFLOW_STATE_ROWS}
            onQuickAdd={handleQuickAdd}
            onVisibilityChange={setHiddenColumnIds}
          />
        ) : null}
        <div className="min-h-0 flex-1 overflow-hidden">
          <CollaborativeBoard
            workspaceId={workspace.id}
            teamId={teamId}
            stories={visibleStories}
            workflowStates={workflowStates.length > 0 ? workflowStates : DEMO_WORKFLOW_STATE_ROWS}
            storyTitles={storyTitles}
            selectedStoryId={selectedStoryId}
            onCardSelect={handleCardSelect}
            groupBy={groupBy}
            epics={epics}
            cycles={cycles}
            className="h-full"
            hiddenColumnIds={hiddenColumnIds}
            onQuickAdd={handleQuickAdd}
          />
        </div>
      </div>
      {selectedStory ? (
        <StoryDetailSidebarPanel
          story={selectedStory}
          onClose={() => storyStore.selectStory(null)}
        />
      ) : (
        <aside
          data-testid="story-detail-sidebar"
          className="flex h-full w-full flex-col items-center justify-center border-t border-border p-6 text-center lg:w-[360px] lg:border-s lg:border-t-0"
        >
          <p className="text-sm text-muted-foreground">Select a Story to view properties</p>
        </aside>
      )}
    </div>
  );
}

export default function StoriesBoardPage(): React.ReactElement {
  const { stories } = useStoryStore();

  return (
    <AppShell viewTitle="Story Board" breadcrumbs={['Team Design', 'Board']}>
      <StoriesViewProvider stories={stories} layout="board">
        <StoriesBoardBody />
      </StoriesViewProvider>
    </AppShell>
  );
}
