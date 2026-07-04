import { ENTITY_TOPICS } from '@landi-flow/core/events';
import type {
  CorrelationContext,
  Milestone,
  Story,
  StoryPriority,
} from '@landi-flow/core/types';
import { BaseController } from './base-controller.js';

export interface StoryCreateInput {
  team_id: string;
  title: string;
  workflow_state_id: string;
  description_md?: string | null;
  priority?: StoryPriority;
  assignee_id?: string | null;
  delegate_agent_id?: string | null;
  epic_id?: string | null;
  milestone_id?: string | null;
  cycle_id?: string | null;
  estimate?: number | null;
}

export interface StoryUpdateInput {
  title?: string;
  description_md?: string | null;
  workflow_state_id?: string;
  priority?: StoryPriority;
  assignee_id?: string | null;
  delegate_agent_id?: string | null;
  epic_id?: string | null;
  milestone_id?: string | null;
  cycle_id?: string | null;
  estimate?: number | null;
  sort_order?: number;
}

export class StoryController extends BaseController {
  private async nextStoryNumber(teamId: string): Promise<number> {
    const { data, error } = await this.db
      .from('stories')
      .select('number')
      .eq('team_id', teamId)
      .order('number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to allocate story number: ${error.message}`);
    }

    const current = (data as { number: number } | null)?.number ?? 0;
    return current + 1;
  }

  async list(
    workspaceId: string,
    teamId: string,
    limit = 50
  ): Promise<Story[]> {
    const { data, error } = await this.db
      .from('stories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('team_id', teamId)
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list stories: ${error.message}`);
    }

    return (data ?? []) as Story[];
  }

  async getById(
    workspaceId: string,
    teamId: string,
    storyId: string
  ): Promise<Story | null> {
    const { data, error } = await this.db
      .from('stories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('team_id', teamId)
      .eq('id', storyId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get story: ${error.message}`);
    }

    return data as Story | null;
  }

  async getByIdentifier(
    workspaceId: string,
    identifier: string
  ): Promise<Story | null> {
    const { data, error } = await this.db
      .from('stories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('identifier', identifier)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get story by identifier: ${error.message}`);
    }

    return data as Story | null;
  }

  async create(
    workspaceId: string,
    input: StoryCreateInput,
    ctx: CorrelationContext,
    createdBy?: string | null
  ): Promise<{ story: Story; correlation_id: string; outbox_event_id: string | null }> {
    const number = await this.nextStoryNumber(input.team_id);

    const row = {
      workspace_id: workspaceId,
      team_id: input.team_id,
      number,
      identifier: 'pending',
      title: input.title,
      description_md: input.description_md ?? null,
      workflow_state_id: input.workflow_state_id,
      priority: input.priority ?? 'none',
      assignee_id: input.assignee_id ?? null,
      delegate_agent_id: input.delegate_agent_id ?? null,
      epic_id: input.epic_id ?? null,
      milestone_id: input.milestone_id ?? null,
      cycle_id: input.cycle_id ?? null,
      estimate: input.estimate ?? null,
      created_by: createdBy ?? null,
      correlation_id: ctx.correlation_id,
    };

    const { result, outbox_event_id } = await this.mutateWithOutbox(
      workspaceId,
      ENTITY_TOPICS.STORY_CREATED,
      { team_id: input.team_id, title: input.title },
      ctx,
      async () => {
        const { data, error } = await this.db.from('stories').insert(row).select('*').single();
        if (error) {
          throw new Error(`Failed to create story: ${error.message}`);
        }
        return data as Story;
      }
    );

    return { story: result, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async update(
    workspaceId: string,
    teamId: string,
    storyId: string,
    input: StoryUpdateInput,
    ctx: CorrelationContext
  ): Promise<{ story: Story; correlation_id: string; outbox_event_id: string | null }> {
    const existing = await this.getById(workspaceId, teamId, storyId);
    if (!existing) {
      throw new Error('Story not found');
    }

    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description_md !== undefined) patch.description_md = input.description_md;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.assignee_id !== undefined) patch.assignee_id = input.assignee_id;
    if (input.delegate_agent_id !== undefined) patch.delegate_agent_id = input.delegate_agent_id;
    if (input.epic_id !== undefined) patch.epic_id = input.epic_id;
    if (input.milestone_id !== undefined) patch.milestone_id = input.milestone_id;
    if (input.cycle_id !== undefined) patch.cycle_id = input.cycle_id;
    if (input.estimate !== undefined) patch.estimate = input.estimate;
    if (input.sort_order !== undefined) patch.sort_order = input.sort_order;

    let topic: string = ENTITY_TOPICS.STORY_UPDATED;
    if (
      input.workflow_state_id !== undefined &&
      input.workflow_state_id !== existing.workflow_state_id
    ) {
      patch.workflow_state_id = input.workflow_state_id;
      topic = ENTITY_TOPICS.STORY_STATUS_CHANGED;
    } else if (input.workflow_state_id !== undefined) {
      patch.workflow_state_id = input.workflow_state_id;
    }

    const { result, outbox_event_id } = await this.mutateWithOutbox(
      workspaceId,
      topic,
      {
        story_id: storyId,
        identifier: existing.identifier,
        ...(topic === ENTITY_TOPICS.STORY_STATUS_CHANGED
          ? {
              old_state_id: existing.workflow_state_id,
              new_state_id: input.workflow_state_id,
            }
          : { patch }),
      },
      ctx,
      async () => {
        const { data, error } = await this.db
          .from('stories')
          .update(patch)
          .eq('workspace_id', workspaceId)
          .eq('team_id', teamId)
          .eq('id', storyId)
          .select('*')
          .single();

        if (error) {
          throw new Error(`Failed to update story: ${error.message}`);
        }
        return data as Story;
      }
    );

    return { story: result, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async listByEpic(workspaceId: string, epicId: string): Promise<Story[]> {
    const { data, error } = await this.db
      .from('stories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('epic_id', epicId)
      .is('archived_at', null)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to list epic stories: ${error.message}`);
    }

    return (data ?? []) as Story[];
  }
}

export class MilestoneController extends BaseController {
  async listByEpic(workspaceId: string, epicId: string): Promise<Milestone[]> {
    const { data, error } = await this.db
      .from('milestones')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('epic_id', epicId)
      .order('position', { ascending: true });

    if (error) {
      throw new Error(`Failed to list milestones: ${error.message}`);
    }

    return (data ?? []) as Milestone[];
  }

  async create(
    workspaceId: string,
    epicId: string,
    input: { name: string; description?: string | null; target_date?: string | null; position?: number },
    ctx: CorrelationContext
  ): Promise<{ milestone: Milestone; correlation_id: string; outbox_event_id: string | null }> {
    const row = {
      workspace_id: workspaceId,
      epic_id: epicId,
      name: input.name,
      description: input.description ?? null,
      target_date: input.target_date ?? null,
      position: input.position ?? 0,
    };

    const { result, outbox_event_id } = await this.mutateWithOutbox(
      workspaceId,
      ENTITY_TOPICS.EPIC_UPDATED,
      { epic_id: epicId, milestone_name: input.name, action: 'milestone_created' },
      ctx,
      async () => {
        const { data, error } = await this.db.from('milestones').insert(row).select('*').single();
        if (error) {
          throw new Error(`Failed to create milestone: ${error.message}`);
        }
        return data as Milestone;
      }
    );

    return { milestone: result, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async update(
    workspaceId: string,
    epicId: string,
    milestoneId: string,
    input: { name?: string; description?: string | null; target_date?: string | null; position?: number },
    ctx: CorrelationContext
  ): Promise<{ milestone: Milestone; correlation_id: string; outbox_event_id: string | null }> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.target_date !== undefined) patch.target_date = input.target_date;
    if (input.position !== undefined) patch.position = input.position;

    const { result, outbox_event_id } = await this.mutateWithOutbox(
      workspaceId,
      ENTITY_TOPICS.EPIC_UPDATED,
      { epic_id: epicId, milestone_id: milestoneId, action: 'milestone_updated' },
      ctx,
      async () => {
        const { data, error } = await this.db
          .from('milestones')
          .update(patch)
          .eq('workspace_id', workspaceId)
          .eq('epic_id', epicId)
          .eq('id', milestoneId)
          .select('*')
          .single();

        if (error) {
          throw new Error(`Failed to update milestone: ${error.message}`);
        }
        return data as Milestone;
      }
    );

    return { milestone: result, correlation_id: ctx.correlation_id, outbox_event_id };
  }
}
