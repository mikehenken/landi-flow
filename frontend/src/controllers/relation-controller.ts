import type { Story, StoryRelation, StoryRelationType } from '@landi-flow/core/types';
import { isMockAuthEnabled } from '@/lib/api/config';
import { apiFetch, apiList } from '@/lib/api/client';
import { createCorrelationContext } from '@/lib/correlation';
import {
  addMockStoryRelation,
  listRelationsForStory,
  removeMockStoryRelation,
} from '@/lib/story-relations-seed';

export interface RelationCreateInput {
  target_story_id: string;
  relation_type: StoryRelationType;
}

export function listStoryRelations(story: Story): StoryRelation[] {
  return listRelationsForStory(story.id);
}

export async function addStoryRelation(
  workspaceId: string,
  story: Story,
  input: RelationCreateInput,
): Promise<StoryRelation> {
  if (isMockAuthEnabled()) {
    return addMockStoryRelation({
      workspaceId,
      sourceStoryId: story.id,
      targetStoryId: input.target_story_id,
      relationType: input.relation_type,
      createdBy: story.creator_id,
    });
  }

  const response = await apiFetch<{ relation: StoryRelation }>(
    `workspaces/${workspaceId}/teams/${story.team_id}/stories/${story.id}/relations`,
    {
      method: 'POST',
      body: input,
      correlationId: createCorrelationContext().correlation_id,
    },
  );
  return response.relation;
}

export async function removeStoryRelation(
  workspaceId: string,
  story: Story,
  relationId: string,
): Promise<void> {
  if (isMockAuthEnabled()) {
    removeMockStoryRelation(relationId);
    return;
  }

  await apiFetch(
    `workspaces/${workspaceId}/teams/${story.team_id}/stories/${story.id}/relations/${relationId}`,
    {
      method: 'DELETE',
      correlationId: createCorrelationContext().correlation_id,
    },
  );
}

export async function loadStoryRelations(
  workspaceId: string,
  story: Story,
): Promise<StoryRelation[]> {
  if (isMockAuthEnabled()) {
    return listRelationsForStory(story.id);
  }
  return apiList<StoryRelation>(
    `workspaces/${workspaceId}/teams/${story.team_id}/stories/${story.id}/relations`,
  );
}
