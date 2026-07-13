'use client';

import * as React from 'react';
import type { Epic, Story } from '@landi-flow/core/types';
import { useParams } from 'next/navigation';
import { Button } from '@landi-flow/ui';
import { AppShell } from '@/components/app-shell';
import { ArtifactPanel } from '@/components/artifacts/artifact-panel';
import { CollaborativeEpicPanel } from '@/components/collaboration';
import { UnifiedCommentsPanel } from '@/components/comments/unified-comments-panel';
import { useOpenCreateStoryModal } from '@/components/create-story-modal';
import { DescriptionEditor } from '@/components/description-editor';
import {
  EpicCustomersTab,
  EpicTeamSubTabs,
} from '@/components/epics/epic-advanced-tabs';
import { EpicAttachedViewsTab } from '@/components/epics/epic-attached-views-tab';
import {
  EpicDetailSidebar,
  EpicOverviewPanel,
} from '@/components/epic-detail-sidebar';
import { EpicDependenciesPanel } from '@/components/milestones/epic-dependencies-panel';
import { StoryListView } from '@/components/story-list-view';
import { useEpicStore } from '@/hooks/use-epic-store';
import { useDefaultTeamLabel } from '@/hooks/use-default-team-label';
import { useStoryStore } from '@/hooks/use-story-store';
import { useWorkspaceTeams } from '@/hooks/use-workspace-teams';
import { epicStore } from '@/stores/epic-store';
import { storyStore } from '@/stores/story-store';
import { updateEpicDescription } from '@/controllers/epic-controller';
import { useWorkspace } from '@/lib/workspace';
import { isMockAuthEnabled } from '@/lib/api/config';
import { getWorkflowStatesForTeam } from '@/lib/api/workspace-context';
import { DEMO_WORKFLOW_STATE_ROWS } from '@/lib/seed-data';

type EpicDetailTab =
  | 'overview'
  | 'stories'
  | 'dependencies'
  | 'customers'
  | 'views'
  | 'artifacts';

function EpicStoriesTab({
  epic,
  epicStories,
  selectedStoryId,
}: {
  epic: Epic;
  epicStories: Story[];
  selectedStoryId: string | null;
}): React.ReactElement {
  const openCreateStory = useOpenCreateStoryModal();
  const { stories } = useStoryStore();
  const { workspace } = useWorkspace();
  const { defaultTeamId, teams } = useWorkspaceTeams(workspace.id);
  const [activeTeamId, setActiveTeamId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (activeTeamId) {
      return;
    }
    const fromStories = epicStories.find((story) => story.team_id)?.team_id;
    setActiveTeamId(fromStories ?? defaultTeamId ?? teams[0]?.id ?? null);
  }, [activeTeamId, epicStories, defaultTeamId, teams]);

  const filteredStories = epicStories.filter(
    (story) => !story.is_draft && (!activeTeamId || story.team_id === activeTeamId),
  );

  if (!activeTeamId) {
    return (
      <div data-testid="epic-stories-tab" data-cap="CAP-044" className="p-6 text-sm text-muted-foreground">
        No team available for this epic yet.
      </div>
    );
  }

  return (
    <EpicTeamSubTabs
      epic={epic}
      stories={stories}
      activeTeamId={activeTeamId}
      onTeamChange={setActiveTeamId}
    >
      <div data-testid="epic-stories-tab" data-cap="CAP-044">
        <StoryListView
          stories={filteredStories}
          selectedStoryId={selectedStoryId}
          onStorySelect={(id) => storyStore.selectStory(id)}
          onCreateStory={openCreateStory}
        />
      </div>
    </EpicTeamSubTabs>
  );
}

export default function EpicDetailPage(): React.ReactElement {
  const params = useParams<{ epicId: string }>();
  const epicId = params.epicId;
  const { workspace } = useWorkspace();
  const { epics } = useEpicStore();
  const { stories, selectedStoryId } = useStoryStore();
  const teamLabel = useDefaultTeamLabel();
  const [activeTab, setActiveTab] = React.useState<EpicDetailTab>('overview');

  const epic = epics.find((entry) => entry.id === epicId);
  const epicStories = stories.filter((story) => story.epic_id === epicId);
  const workflowStates = isMockAuthEnabled()
    ? DEMO_WORKFLOW_STATE_ROWS
    : getWorkflowStatesForTeam();

  React.useEffect(() => {
    if (epicId) {
      epicStore.selectEpic(epicId);
    }
  }, [epicId]);

  const handleDescriptionChange = React.useCallback(
    (markdown: string) => {
      if (epic) {
        void updateEpicDescription(workspace.id, epic, markdown);
      }
    },
    [epic, workspace.id],
  );

  if (!epic) {
    return (
      <AppShell viewTitle="Epic not found" breadcrumbs={[teamLabel, 'Epics']}>
        <p className="p-6 text-sm text-muted-foreground">Epic not found.</p>
      </AppShell>
    );
  }

  const tabs: Array<{ id: EpicDetailTab; label: string; testId: string }> = [
    { id: 'overview', label: 'Overview', testId: 'epic-tab-overview' },
    { id: 'stories', label: `Stories (${epicStories.length})`, testId: 'epic-tab-stories' },
    { id: 'dependencies', label: 'Dependencies', testId: 'epic-tab-dependencies' },
    { id: 'customers', label: 'Customers', testId: 'epic-tab-customers' },
    { id: 'views', label: 'Views', testId: 'epic-tab-views' },
    { id: 'artifacts', label: 'Artifacts', testId: 'epic-tab-artifacts' },
  ];

  return (
    <AppShell
      viewTitle={epic.name}
      breadcrumbs={[teamLabel, 'Epics', epic.name]}
    >
      <div className="flex h-full min-h-0 flex-col lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            className="flex flex-wrap gap-1 border-b border-border px-6 pt-3"
            role="tablist"
            aria-label="Epic detail sections"
          >
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                data-testid={tab.testId}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {activeTab === 'overview' ? (
            <EpicOverviewPanel epic={epic} epicStories={epicStories}>
              <CollaborativeEpicPanel epic={epic} epicStories={epicStories}>
                <DescriptionEditor
                  workspaceId={epic.workspace_id}
                  entityType="epic"
                  entityId={epic.id}
                  value={epic.description_md}
                  onChange={handleDescriptionChange}
                  placeholder="Describe the Epic — type **markdown** or paste a spec…"
                  sectionClassName="mt-2 max-w-3xl"
                  label="Epic description"
                />
              </CollaborativeEpicPanel>
              <div className="mt-6 max-w-3xl px-6 pb-6">
                <UnifiedCommentsPanel epicId={epic.id} />
              </div>
            </EpicOverviewPanel>
          ) : activeTab === 'stories' ? (
            <EpicStoriesTab
              epic={epic}
              epicStories={epicStories}
              selectedStoryId={selectedStoryId}
            />
          ) : activeTab === 'dependencies' ? (
            <EpicDependenciesPanel epic={epic} allEpics={epics} />
          ) : activeTab === 'customers' ? (
            <EpicCustomersTab epic={epic} />
          ) : activeTab === 'views' ? (
            <EpicAttachedViewsTab epic={epic} />
          ) : (
            <div className="p-6">
              <ArtifactPanel epicId={epic.id} />
            </div>
          )}
        </div>

        <EpicDetailSidebar
          epic={epic}
          epicStories={epicStories}
          workflowStates={workflowStates.length > 0 ? workflowStates : DEMO_WORKFLOW_STATE_ROWS}
        />
      </div>
    </AppShell>
  );
}
