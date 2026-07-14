import type { StoryRelation, StoryRelationType } from '@landi-flow/core/types';

/** Parent → child story IDs for sub-story display toggles (CAP-025 / CAP-006). */
export const SEED_STORY_PARENT_MAP: Readonly<Record<string, readonly string[]>> = {
  'story-002': ['story-003'],
};

/** CAP-007: bidirectional relation seed (mock/dev). */
export const SEED_STORY_RELATIONS: StoryRelation[] = [
  {
    id: 'rel-001',
    workspace_id: 'ws-landi-flow-demo',
    source_story_id: 'story-005',
    target_story_id: 'story-002',
    relation_type: 'blocked_by',
    created_by: 'user-alex',
    created_at: '2026-07-04T10:00:00.000Z',
  },
  {
    id: 'rel-002',
    workspace_id: 'ws-landi-flow-demo',
    source_story_id: 'story-002',
    target_story_id: 'story-005',
    relation_type: 'blocks',
    created_by: 'user-alex',
    created_at: '2026-07-04T10:00:00.000Z',
  },
  {
    id: 'rel-003',
    workspace_id: 'ws-landi-flow-demo',
    source_story_id: 'story-001',
    target_story_id: 'story-004',
    relation_type: 'related',
    created_by: 'user-jane',
    created_at: '2026-07-03T12:00:00.000Z',
  },
];

let mockRelations: StoryRelation[] = [...SEED_STORY_RELATIONS];

export function getMockStoryRelations(): StoryRelation[] {
  return [...mockRelations];
}

export function resetMockStoryRelations(): void {
  mockRelations = [...SEED_STORY_RELATIONS];
}

export function addMockStoryRelation(input: {
  workspaceId: string;
  sourceStoryId: string;
  targetStoryId: string;
  relationType: StoryRelationType;
  createdBy: string | null;
}): StoryRelation {
  const relation: StoryRelation = {
    id: `rel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    workspace_id: input.workspaceId,
    source_story_id: input.sourceStoryId,
    target_story_id: input.targetStoryId,
    relation_type: input.relationType,
    created_by: input.createdBy,
    created_at: new Date().toISOString(),
  };
  mockRelations = [...mockRelations, relation];
  return relation;
}

export function removeMockStoryRelation(relationId: string): void {
  mockRelations = mockRelations.filter((relation) => relation.id !== relationId);
}

export function getParentStoryId(childStoryId: string): string | null {
  for (const [parentId, childIds] of Object.entries(SEED_STORY_PARENT_MAP)) {
    if (childIds.includes(childStoryId)) {
      return parentId;
    }
  }
  const parentRelation = mockRelations.find(
    (relation) =>
      relation.target_story_id === childStoryId &&
      (relation.relation_type === 'parent' || relation.relation_type === 'sub'),
  );
  if (parentRelation?.relation_type === 'sub') {
    return parentRelation.source_story_id;
  }
  return null;
}

export function getSubStoryIds(parentStoryId: string): readonly string[] {
  const fromMap = SEED_STORY_PARENT_MAP[parentStoryId] ?? [];
  const fromRelations = mockRelations
    .filter(
      (relation) =>
        relation.source_story_id === parentStoryId && relation.relation_type === 'sub',
    )
    .map((relation) => relation.target_story_id);
  return [...new Set([...fromMap, ...fromRelations])];
}

/** Optional customer link for filter dimension CAP-068 (mock/dev). */
export const SEED_STORY_CUSTOMER_MAP: Readonly<Record<string, string>> = {
  'story-001': 'customer-acme',
  'story-002': 'customer-acme',
};

export function getStoryCustomerId(storyId: string): string | null {
  return SEED_STORY_CUSTOMER_MAP[storyId] ?? null;
}

export function listRelationsForStory(storyId: string): StoryRelation[] {
  return mockRelations.filter(
    (relation) =>
      relation.source_story_id === storyId || relation.target_story_id === storyId,
  );
}
