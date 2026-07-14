import { ENTITY_TOPICS } from '@landi-flow/core/events';
import type { CorrelationContext, StoryRelation, StoryRelationType } from '@landi-flow/core/types';
import { BaseController } from './base-controller.js';

export interface RelationCreateInput {
  target_story_id: string;
  relation_type: StoryRelationType;
  created_by?: string | null;
}

export class RelationController extends BaseController {
  async list(workspaceId: string, sourceStoryId: string): Promise<StoryRelation[]> {
    await this.assertWorkspaceMember(workspaceId);

    const { data, error } = await this.db
      .from('story_relations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('source_story_id', sourceStoryId);

    if (error) {
      throw new Error(`Failed to list relations: ${error.message}`);
    }

    return (data ?? []) as StoryRelation[];
  }

  async create(
    workspaceId: string,
    sourceStoryId: string,
    input: RelationCreateInput,
    ctx: CorrelationContext
  ): Promise<{ relation: StoryRelation; correlation_id: string; outbox_event_id: string | null }> {
    await this.assertWorkspaceMember(workspaceId);

    if (sourceStoryId === input.target_story_id) {
      throw new Error('Cannot relate story to itself');
    }

    const { entity, outbox_event_id } = await this.mutateWithOutbox<StoryRelation>(
      workspaceId,
      ENTITY_TOPICS.STORY_UPDATED,
      {
        story_id: sourceStoryId,
        action: 'relation_added',
        target_story_id: input.target_story_id,
        relation_type: input.relation_type,
      },
      ctx,
      'create_story_relation',
      {
        source_story_id: sourceStoryId,
        target_story_id: input.target_story_id,
        relation_type: input.relation_type,
        created_by: input.created_by ?? this.userId,
      }
    );

    return { relation: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async remove(
    workspaceId: string,
    sourceStoryId: string,
    relationId: string,
    ctx: CorrelationContext
  ): Promise<{ correlation_id: string; outbox_event_id: string | null }> {
    await this.assertWorkspaceMember(workspaceId);

    const { outbox_event_id } = await this.mutateWithOutbox<StoryRelation>(
      workspaceId,
      ENTITY_TOPICS.STORY_UPDATED,
      { story_id: sourceStoryId, action: 'relation_removed', relation_id: relationId },
      ctx,
      'delete_story_relation',
      {
        source_story_id: sourceStoryId,
        relation_id: relationId,
      }
    );

    return { correlation_id: ctx.correlation_id, outbox_event_id };
  }
}
