import type { Story, StoryPriority } from '@landi-flow/core/types';
import { isMockAuthEnabled } from '@/lib/api/config';
import { persistMockStoryPatch } from '@/lib/story-mock-persistence';
import { apiFetch, apiList } from '@/lib/api/client';
import { mapStoryRow, type DbStoryRow } from '@/lib/api/mappers';
import {
  getDefaultTeamId,
  getDefaultWorkflowStateId,
  loadWorkspaceRuntimeContext,
} from '@/lib/api/workspace-context';
import { createCorrelationContext } from '@/lib/correlation';
import { DEMO_TEAM_ID } from '@/lib/seed-data';
import { WORKFLOW_STATES } from '@/lib/workflow-states';
import { storyStore, type CreateStoryInput } from '@/stores/story-store';

function resolveTeamId(explicitTeamId?: string | null): string {
  if (isMockAuthEnabled()) {
    return explicitTeamId ?? DEMO_TEAM_ID;
  }
  const teamId = explicitTeamId ?? getDefaultTeamId();
  if (!teamId) {
    throw new Error('No team configured for this workspace');
  }
  return teamId;
}

function resolveWorkflowStateId(explicitStateId?: string | null): string {
  if (isMockAuthEnabled()) {
    return explicitStateId ?? WORKFLOW_STATES.todo;
  }
  const stateId = explicitStateId ?? getDefaultWorkflowStateId();
  if (!stateId) {
    throw new Error('No workflow state configured for this workspace team');
  }
  return stateId;
}

export async function loadStories(workspaceId: string, teamId?: string): Promise<Story[]> {
  if (isMockAuthEnabled()) {
    return storyStore.getServerSnapshot().stories;
  }
  const resolvedTeamId = teamId ?? getDefaultTeamId();
  if (!resolvedTeamId) {
    return [];
  }
  const rows = await apiList<DbStoryRow>(
    `workspaces/${workspaceId}/teams/${resolvedTeamId}/stories`,
  );
  return rows.map(mapStoryRow);
}

export async function createStory(input: CreateStoryInput): Promise<Story> {
  if (isMockAuthEnabled()) {
    return storyStore.createStory(input);
  }

  await loadWorkspaceRuntimeContext(input.workspaceId);
  const teamId = resolveTeamId(input.teamId);
  const workflowStateId = resolveWorkflowStateId(input.workflowStateId);
  const temp = storyStore.createStory({ ...input, teamId, workflowStateId, isDraft: input.isDraft });

  try {
    const response = await apiFetch<{ story: DbStoryRow }>(
      `workspaces/${input.workspaceId}/teams/${teamId}/stories`,
      {
        method: 'POST',
        body: {
          title: input.title,
          description_md: input.descriptionMd ?? null,
          workflow_state_id: workflowStateId,
          priority: input.priority ?? 'none',
          epic_id: input.epicId ?? null,
          is_draft: input.isDraft ?? false,
        },
        correlationId: createCorrelationContext().correlation_id,
      },
    );
    storyStore.removeStory(temp.id);
    const story = mapStoryRow(response.story);
    storyStore.upsertStory(story);
    storyStore.selectStory(story.id);
    return story;
  } catch (error) {
    storyStore.removeStory(temp.id);
    throw error;
  }
}

export async function updateStoryDescription(
  workspaceId: string,
  story: Story,
  descriptionMd: string,
): Promise<void> {
  const previous = story.description_md;
  storyStore.updateStoryDescription(story.id, descriptionMd);

  if (isMockAuthEnabled()) {
    return;
  }

  try {
    const response = await apiFetch<{ story: DbStoryRow }>(
      `workspaces/${workspaceId}/teams/${story.team_id}/stories/${story.id}`,
      {
        method: 'PATCH',
        body: { description_md: descriptionMd },
      },
    );
    storyStore.upsertStory(mapStoryRow(response.story));
  } catch (error) {
    storyStore.updateStoryDescription(story.id, previous ?? '');
    throw error;
  }
}

export async function updateStoryWorkflowState(
  workspaceId: string,
  story: Story,
  workflowStateId: string,
): Promise<void> {
  const previous = story.workflow_state_id;
  storyStore.updateStoryWorkflowState(story.id, workflowStateId);
  if (isMockAuthEnabled()) {
    persistMockStoryPatch(story.id, { workflow_state_id: workflowStateId });
    return;
  }
  try {
    const response = await apiFetch<{ story: DbStoryRow }>(
      `workspaces/${workspaceId}/teams/${story.team_id}/stories/${story.id}`,
      { method: 'PATCH', body: { workflow_state_id: workflowStateId } },
    );
    storyStore.upsertStory(mapStoryRow(response.story));
  } catch (error) {
    storyStore.updateStoryWorkflowState(story.id, previous);
    throw error;
  }
}

export async function updateStoryPriority(
  workspaceId: string,
  story: Story,
  priority: StoryPriority,
): Promise<void> {
  const previous = story.priority;
  storyStore.updateStoryPriority(story.id, priority);
  if (isMockAuthEnabled()) {
    persistMockStoryPatch(story.id, { priority });
    return;
  }
  try {
    const response = await apiFetch<{ story: DbStoryRow }>(
      `workspaces/${workspaceId}/teams/${story.team_id}/stories/${story.id}`,
      { method: 'PATCH', body: { priority } },
    );
    storyStore.upsertStory(mapStoryRow(response.story));
  } catch (error) {
    storyStore.updateStoryPriority(story.id, previous);
    throw error;
  }
}

export async function updateStoryEpic(
  workspaceId: string,
  story: Story,
  epicId: string | null,
): Promise<void> {
  const previous = story.epic_id;
  storyStore.updateStoryEpic(story.id, epicId);
  if (isMockAuthEnabled()) {
    return;
  }
  try {
    const response = await apiFetch<{ story: DbStoryRow }>(
      `workspaces/${workspaceId}/teams/${story.team_id}/stories/${story.id}`,
      { method: 'PATCH', body: { epic_id: epicId } },
    );
    storyStore.upsertStory(mapStoryRow(response.story));
  } catch (error) {
    storyStore.updateStoryEpic(story.id, previous);
    throw error;
  }
}

export async function updateStoryOwner(
  workspaceId: string,
  story: Story,
  assigneeId: string | null,
): Promise<void> {
  const previous = story.assignee_id;
  storyStore.setOwner(story.id, assigneeId);
  if (isMockAuthEnabled()) {
    return;
  }
  try {
    const response = await apiFetch<{ story: DbStoryRow }>(
      `workspaces/${workspaceId}/teams/${story.team_id}/stories/${story.id}`,
      { method: 'PATCH', body: { assignee_id: assigneeId } },
    );
    storyStore.upsertStory(mapStoryRow(response.story));
  } catch (error) {
    storyStore.setOwner(story.id, previous);
    throw error;
  }
}

export async function updateStoryFollowers(
  workspaceId: string,
  story: Story,
  followerIds: string[],
): Promise<void> {
  const previous = [...story.follower_ids];
  storyStore.setFollowers(story.id, followerIds);
  if (isMockAuthEnabled()) {
    return;
  }
  // follower_ids not yet persisted in linear_clone.stories — local-only until schema lands.
  void workspaceId;
  void previous;
}

export async function updateStoryDelegateAgent(
  workspaceId: string,
  story: Story,
  delegateAgentId: string | null,
): Promise<void> {
  const previous = story.delegate_agent_id;
  storyStore.assignStory(story.id, { delegateAgentId });
  if (isMockAuthEnabled()) {
    return;
  }
  try {
    const response = await apiFetch<{ story: DbStoryRow }>(
      `workspaces/${workspaceId}/teams/${story.team_id}/stories/${story.id}`,
      { method: 'PATCH', body: { delegate_agent_id: delegateAgentId } },
    );
    storyStore.upsertStory(mapStoryRow(response.story));
  } catch (error) {
    storyStore.assignStory(story.id, { delegateAgentId: previous });
    throw error;
  }
}

export async function updateStorySortOrder(
  workspaceId: string,
  story: Story,
  sortOrder: number,
): Promise<void> {
  const previous = story.sort_order;
  storyStore.updateStorySortOrder(story.id, sortOrder);
  if (isMockAuthEnabled()) {
    persistMockStoryPatch(story.id, { sort_order: sortOrder });
    return;
  }
  try {
    const response = await apiFetch<{ story: DbStoryRow }>(
      `workspaces/${workspaceId}/teams/${story.team_id}/stories/${story.id}`,
      { method: 'PATCH', body: { sort_order: sortOrder } },
    );
    storyStore.upsertStory(mapStoryRow(response.story));
  } catch (error) {
    storyStore.updateStorySortOrder(story.id, previous);
    throw error;
  }
}

export async function publishStory(workspaceId: string, story: Story): Promise<void> {
  if (story.is_draft !== true) {
    return;
  }
  const previous = story.is_draft;
  storyStore.publishStory(story.id);
  if (isMockAuthEnabled()) {
    return;
  }
  try {
    const response = await apiFetch<{ story: DbStoryRow }>(
      `workspaces/${workspaceId}/teams/${story.team_id}/stories/${story.id}`,
      { method: 'PATCH', body: { is_draft: false } },
    );
    storyStore.upsertStory(mapStoryRow(response.story));
  } catch (error) {
    storyStore.upsertStory({ ...story, is_draft: previous });
    throw error;
  }
}

export async function deleteStory(workspaceId: string, story: Story): Promise<void> {
  storyStore.removeStory(story.id);
  if (isMockAuthEnabled()) {
    return;
  }
  try {
    await apiFetch(
      `workspaces/${workspaceId}/teams/${story.team_id}/stories/${story.id}`,
      { method: 'DELETE' },
    );
  } catch (error) {
    storyStore.upsertStory(story);
    throw error;
  }
}
