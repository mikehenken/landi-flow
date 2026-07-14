import type { Story, StoryPriority } from '@landi-flow/core/types';
import { isMockAuthEnabled } from '@/lib/api/config';
import { persistMockStoryPatch } from '@/lib/story-mock-persistence';
import { apiFetch, apiList } from '@/lib/api/client';
import { mapStoryRow, type DbStoryRow } from '@/lib/api/mappers';
import { storyStore } from '@/stores/story-store';

export async function bulkUpdateStoryWorkflowState(
  workspaceId: string,
  stories: Story[],
  workflowStateId: string,
): Promise<void> {
  for (const story of stories) {
    const previous = story.workflow_state_id;
    storyStore.updateStoryWorkflowState(story.id, workflowStateId);
    if (isMockAuthEnabled()) {
      persistMockStoryPatch(story.id, { workflow_state_id: workflowStateId });
      continue;
    }
    try {
      const response = await apiFetch<{ story: DbStoryRow }>(
        `workspaces/${workspaceId}/teams/${story.team_id}/stories/${story.id}`,
        { method: 'PATCH', body: { workflow_state_id: workflowStateId } },
      );
      storyStore.upsertStory(mapStoryRow(response.story));
    } catch {
      storyStore.updateStoryWorkflowState(story.id, previous);
      throw new Error(`Failed to update status for ${story.identifier}`);
    }
  }
}

export async function bulkUpdateStoryPriority(
  workspaceId: string,
  stories: Story[],
  priority: StoryPriority,
): Promise<void> {
  for (const story of stories) {
    const previous = story.priority;
    storyStore.updateStoryPriority(story.id, priority);
    if (isMockAuthEnabled()) {
      persistMockStoryPatch(story.id, { priority });
      continue;
    }
    try {
      const response = await apiFetch<{ story: DbStoryRow }>(
        `workspaces/${workspaceId}/teams/${story.team_id}/stories/${story.id}`,
        { method: 'PATCH', body: { priority } },
      );
      storyStore.upsertStory(mapStoryRow(response.story));
    } catch {
      storyStore.updateStoryPriority(story.id, previous);
      throw new Error(`Failed to update priority for ${story.identifier}`);
    }
  }
}

export async function bulkDeleteStories(workspaceId: string, stories: Story[]): Promise<void> {
  for (const story of stories) {
    storyStore.removeStory(story.id);
    if (isMockAuthEnabled()) {
      continue;
    }
    try {
      await apiFetch(
        `workspaces/${workspaceId}/teams/${story.team_id}/stories/${story.id}`,
        { method: 'DELETE' },
      );
    } catch {
      storyStore.upsertStory(story);
      throw new Error(`Failed to delete ${story.identifier}`);
    }
  }
}

/** Re-export for convenience in view layer tests. */
export { apiList };
