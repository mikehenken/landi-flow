'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { BoardToolbar } from '@/components/board-toolbar';
import { CollaborativeBoardLazy } from '@/components/collaboration/lazy-collaborative-board';
import { StoryDetailSurface } from '@/components/story-detail-panel';
import {
  StoriesViewProvider,
  useStoriesViewContext,
} from '@/components/stories-view-provider';
import { BoardColumnControls } from '@/components/views/board-column-controls';
import { useBoardGroupByPreference } from '@/hooks/use-board-group-by-preference';
import { useDefaultTeamLabel } from '@/hooks/use-default-team-label';
import { useEpicStore } from '@/hooks/use-epic-store';
import { useStoryStore } from '@/hooks/use-story-store';
import { useSelectedStoryId } from '@/hooks/use-selected-story-id';
import { useTeamCycles } from '@/hooks/use-team-cycles';
import { useTeamWorkflowStates } from '@/hooks/use-team-workflow-states';
import { useWorkspaceTeams } from '@/hooks/use-workspace-teams';
import { storyStore } from '@/stores/story-store';
import { useWorkspace } from '@/lib/workspace';
import { createStory as persistCreateStory } from '@/controllers/story-controller';
import { readHiddenColumnIds } from '@/lib/views/board-column-preferences';
import {
  resolveBoardTeamId,
  resolveBoardWorkflowStates,
} from '@/lib/board/resolve-board-workflow-states';
import { useStoryDeepLink, useStoryModalSelect } from '@/lib/story/use-story-deep-link';
import { getWorkflowStatesForTeam } from '@/lib/api/workspace-context';

function StoriesBoardBody(): React.ReactElement {
  const { workspace } = useWorkspace();
  const selectedStoryId = useSelectedStoryId();
  const { epics } = useEpicStore();
  const { visibleStories } = useStoriesViewContext();
  const { groupBy, setGroupBy } = useBoardGroupByPreference();
  const { defaultTeamId } = useWorkspaceTeams(workspace.id);
  const teamId = resolveBoardTeamId(visibleStories, defaultTeamId);
  const { workflowStates } = useTeamWorkflowStates(workspace.id, teamId);
  const { cycles } = useTeamCycles(workspace.id, teamId);
  const cachedStates = getWorkflowStatesForTeam();
  const rosterStates = workflowStates.length > 0 ? workflowStates : cachedStates;
  const resolvedWorkflowStates = resolveBoardWorkflowStates(visibleStories, rosterStates);
  const [hiddenColumnIds, setHiddenColumnIds] = React.useState<Set<string>>(() =>
    teamId ? readHiddenColumnIds(teamId) : new Set<string>(),
  );

  React.useEffect(() => {
    if (!teamId) {
      setHiddenColumnIds(new Set());
      return;
    }
    setHiddenColumnIds(readHiddenColumnIds(teamId));
  }, [teamId]);

  useStoryDeepLink();
  const handleStorySelect = useStoryModalSelect();
  const { stories } = useStoryStore();

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

  const storyTitles = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const story of visibleStories) {
      map[story.id] = story.title;
    }
    return map;
  }, [visibleStories]);

  const handleQuickAdd = React.useCallback(
    (workflowStateId: string) => {
      if (!teamId) {
        return;
      }
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
        {groupBy === 'none' && teamId && resolvedWorkflowStates.length > 0 ? (
          <BoardColumnControls
            teamId={teamId}
            workflowStates={resolvedWorkflowStates}
            onQuickAdd={handleQuickAdd}
            onVisibilityChange={setHiddenColumnIds}
          />
        ) : null}
        <div className="min-h-0 flex-1 overflow-hidden">
          {teamId && resolvedWorkflowStates.length > 0 ? (
            <CollaborativeBoardLazy
              workspaceId={workspace.id}
              teamId={teamId}
              stories={visibleStories}
              workflowStates={resolvedWorkflowStates}
              storyTitles={storyTitles}
              selectedStoryId={selectedStoryId}
              onCardSelect={handleStorySelect}
              groupBy={groupBy}
              epics={epics}
              cycles={cycles}
              className="h-full"
              hiddenColumnIds={hiddenColumnIds}
              onQuickAdd={handleQuickAdd}
            />
          ) : (
            <div
              className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground"
              data-testid="story-board-empty-roster"
            >
              {visibleStories.length === 0
                ? 'No stories to show on the board.'
                : resolvedWorkflowStates.length === 0
                  ? 'Stories are missing workflow status.'
                  : 'Loading workflow columns…'}
            </div>
          )}
        </div>
      </div>
      <StoryDetailSurface
        story={selectedStory}
        onClose={() => storyStore.selectStory(null)}
      />
    </div>
  );
}

export default function StoriesBoardPage(): React.ReactElement {
  const { stories } = useStoryStore();
  const teamLabel = useDefaultTeamLabel();

  return (
    <AppShell viewTitle="Story Board" breadcrumbs={[teamLabel, 'Board']}>
      <StoriesViewProvider stories={stories} layout="board">
        <StoriesBoardBody />
      </StoriesViewProvider>
    </AppShell>
  );
}
