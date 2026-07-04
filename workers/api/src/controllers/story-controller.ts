import { ENTITY_TOPICS } from '@landi-flow/core/events';
import type {
  CorrelationContext,
  Milestone,
  Story,
  StoryPriority,
  WorkflowCategory,
  WorkflowState,
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

export interface WorkflowStateCreateInput {
  team_id: string;
  name: string;
  category: WorkflowCategory;
  position?: number;
  color?: string | null;
  is_default?: boolean;
}

export class WorkflowStateController extends BaseController {
  async list(workspaceId: string, teamId: string): Promise<WorkflowState[]> {
    await this.assertTeamReadable(workspaceId, teamId);

    const { error: seedError } = await this.db.rpc('ensure_default_workflow_states', {
      p_team_id: teamId,
    });
    if (seedError) {
      throw new Error(`Failed to ensure default workflow states: ${seedError.message}`);
    }

    const { data, error } = await this.db
      .from('workflow_states')
      .select('*')
      .eq('team_id', teamId)
      .order('position', { ascending: true });

    if (error) {
      throw new Error(`Failed to list workflow states: ${error.message}`);
    }

    return (data ?? []) as WorkflowState[];
  }

  async create(
    workspaceId: string,
    input: WorkflowStateCreateInput,
    ctx: CorrelationContext
  ): Promise<{ workflow_state: WorkflowState; correlation_id: string; outbox_event_id: string | null }> {
    await this.assertTeamWriteAccess(workspaceId, input.team_id);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<WorkflowState>(
      workspaceId,
      ENTITY_TOPICS.WORKSPACE_UPDATED,
      { team_id: input.team_id, action: 'workflow_state_created', name: input.name },
      ctx,
      'create_workflow_state',
      {
        team_id: input.team_id,
        name: input.name,
        category: input.category,
        position: input.position ?? 0,
        color: input.color ?? null,
        is_default: input.is_default ?? false,
      }
    );

    return {
      workflow_state: entity,
      correlation_id: ctx.correlation_id,
      outbox_event_id,
    };
  }
}

export class StoryController extends BaseController {
  async list(workspaceId: string, teamId: string, limit = 50): Promise<Story[]> {
    await this.assertTeamReadable(workspaceId, teamId);

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

  async getById(workspaceId: string, teamId: string, storyId: string): Promise<Story | null> {
    await this.assertTeamReadable(workspaceId, teamId);

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

  async getByIdentifier(workspaceId: string, identifier: string): Promise<Story | null> {
    await this.assertWorkspaceMember(workspaceId);

    const { data, error } = await this.db
      .from('stories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('identifier', identifier)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get story by identifier: ${error.message}`);
    }

    if (data) {
      await this.assertTeamReadable(workspaceId, (data as Story).team_id);
    }

    return data as Story | null;
  }

  async create(
    workspaceId: string,
    input: StoryCreateInput,
    ctx: CorrelationContext
  ): Promise<{ story: Story; correlation_id: string; outbox_event_id: string | null }> {
    await this.assertTeamWriteAccess(workspaceId, input.team_id);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<Story>(
      workspaceId,
      ENTITY_TOPICS.STORY_CREATED,
      { team_id: input.team_id, title: input.title },
      ctx,
      'create_story',
      {
        team_id: input.team_id,
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
        created_by: this.userId,
      }
    );

    return { story: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async update(
    workspaceId: string,
    teamId: string,
    storyId: string,
    input: StoryUpdateInput,
    ctx: CorrelationContext
  ): Promise<{ story: Story; correlation_id: string; outbox_event_id: string | null }> {
    await this.assertTeamWriteAccess(workspaceId, teamId);

    const existing = await this.getById(workspaceId, teamId, storyId);
    if (!existing) {
      throw new Error('Story not found');
    }

    let topic: string = ENTITY_TOPICS.STORY_UPDATED;
    if (
      input.workflow_state_id !== undefined &&
      input.workflow_state_id !== existing.workflow_state_id
    ) {
      topic = ENTITY_TOPICS.STORY_STATUS_CHANGED;
    }

    const { entity, outbox_event_id } = await this.mutateWithOutbox<Story>(
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
          : { patch: input }),
      },
      ctx,
      'update_story',
      {
        team_id: teamId,
        story_id: storyId,
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description_md !== undefined ? { description_md: input.description_md } : {}),
        ...(input.workflow_state_id !== undefined
          ? { workflow_state_id: input.workflow_state_id }
          : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.assignee_id !== undefined ? { assignee_id: input.assignee_id } : {}),
        ...(input.delegate_agent_id !== undefined
          ? { delegate_agent_id: input.delegate_agent_id }
          : {}),
        ...(input.epic_id !== undefined ? { epic_id: input.epic_id } : {}),
        ...(input.milestone_id !== undefined ? { milestone_id: input.milestone_id } : {}),
        ...(input.cycle_id !== undefined ? { cycle_id: input.cycle_id } : {}),
        ...(input.estimate !== undefined ? { estimate: input.estimate } : {}),
        ...(input.sort_order !== undefined ? { sort_order: input.sort_order } : {}),
      }
    );

    return { story: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async listByEpic(workspaceId: string, epicId: string): Promise<Story[]> {
    await this.assertWorkspaceMember(workspaceId);

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
    await this.assertWorkspaceMember(workspaceId);

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
    await this.assertWorkspaceMember(workspaceId);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<Milestone>(
      workspaceId,
      ENTITY_TOPICS.EPIC_UPDATED,
      { epic_id: epicId, milestone_name: input.name, action: 'milestone_created' },
      ctx,
      'create_milestone',
      {
        epic_id: epicId,
        name: input.name,
        description: input.description ?? null,
        target_date: input.target_date ?? null,
        position: input.position ?? 0,
      }
    );

    return { milestone: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async update(
    workspaceId: string,
    epicId: string,
    milestoneId: string,
    input: { name?: string; description?: string | null; target_date?: string | null; position?: number },
    ctx: CorrelationContext
  ): Promise<{ milestone: Milestone; correlation_id: string; outbox_event_id: string | null }> {
    await this.assertWorkspaceMember(workspaceId);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<Milestone>(
      workspaceId,
      ENTITY_TOPICS.EPIC_UPDATED,
      { epic_id: epicId, milestone_id: milestoneId, action: 'milestone_updated' },
      ctx,
      'update_milestone',
      {
        epic_id: epicId,
        milestone_id: milestoneId,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.target_date !== undefined ? { target_date: input.target_date } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
      }
    );

    return { milestone: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }
}
