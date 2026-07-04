import { ENTITY_TOPICS } from '@landi-flow/core/events';
import type { CorrelationContext, Cycle, View, ViewLayout, ViewScope } from '@landi-flow/core/types';
import { BaseController } from './base-controller.js';

export interface CycleCreateInput {
  name: string;
  starts_at: string;
  ends_at: string;
  settings?: Record<string, unknown>;
}

export interface CycleUpdateInput {
  name?: string;
  starts_at?: string;
  ends_at?: string;
  settings?: Record<string, unknown>;
}

export class CycleController extends BaseController {
  async list(workspaceId: string, teamId: string): Promise<Cycle[]> {
    await this.assertTeamReadable(workspaceId, teamId);

    const { data, error } = await this.db
      .from('cycles')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('team_id', teamId)
      .order('number', { ascending: false });

    if (error) {
      throw new Error(`Failed to list cycles: ${error.message}`);
    }

    return (data ?? []) as Cycle[];
  }

  async getById(workspaceId: string, teamId: string, cycleId: string): Promise<Cycle | null> {
    await this.assertTeamReadable(workspaceId, teamId);

    const { data, error } = await this.db
      .from('cycles')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('team_id', teamId)
      .eq('id', cycleId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get cycle: ${error.message}`);
    }

    return data as Cycle | null;
  }

  async create(
    workspaceId: string,
    teamId: string,
    input: CycleCreateInput,
    ctx: CorrelationContext
  ): Promise<{ cycle: Cycle; correlation_id: string; outbox_event_id: string | null }> {
    await this.assertTeamWriteAccess(workspaceId, teamId);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<Cycle>(
      workspaceId,
      ENTITY_TOPICS.CYCLE_STARTED,
      { team_id: teamId, name: input.name },
      ctx,
      'create_cycle',
      {
        team_id: teamId,
        name: input.name,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
        settings: input.settings ?? {},
      }
    );

    return { cycle: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async update(
    workspaceId: string,
    teamId: string,
    cycleId: string,
    input: CycleUpdateInput,
    ctx: CorrelationContext
  ): Promise<{ cycle: Cycle; correlation_id: string; outbox_event_id: string | null }> {
    await this.assertTeamWriteAccess(workspaceId, teamId);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<Cycle>(
      workspaceId,
      ENTITY_TOPICS.CYCLE_UPDATED,
      { cycle_id: cycleId, team_id: teamId, patch: input },
      ctx,
      'update_cycle',
      {
        team_id: teamId,
        cycle_id: cycleId,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.starts_at !== undefined ? { starts_at: input.starts_at } : {}),
        ...(input.ends_at !== undefined ? { ends_at: input.ends_at } : {}),
        ...(input.settings !== undefined ? { settings: input.settings } : {}),
      }
    );

    return { cycle: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async complete(
    workspaceId: string,
    teamId: string,
    cycleId: string,
    ctx: CorrelationContext
  ): Promise<{ cycle: Cycle; correlation_id: string; outbox_event_id: string | null }> {
    await this.assertTeamWriteAccess(workspaceId, teamId);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<Cycle>(
      workspaceId,
      ENTITY_TOPICS.CYCLE_UPDATED,
      { cycle_id: cycleId, action: 'completed' },
      ctx,
      'complete_cycle',
      {
        team_id: teamId,
        cycle_id: cycleId,
      }
    );

    return { cycle: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }
}

export interface ViewCreateInput {
  name: string;
  scope: ViewScope;
  layout?: ViewLayout;
  team_id?: string | null;
  epic_id?: string | null;
  owner_id?: string | null;
  description?: string | null;
  filter_ast?: Record<string, unknown>;
  display_options?: Record<string, unknown>;
  grouping?: string | null;
  sub_grouping?: string | null;
  is_shared?: boolean;
}

export interface ViewUpdateInput {
  name?: string;
  description?: string | null;
  layout?: ViewLayout;
  filter_ast?: Record<string, unknown>;
  display_options?: Record<string, unknown>;
  grouping?: string | null;
  sub_grouping?: string | null;
  is_shared?: boolean;
  is_favorited?: boolean;
}

export class ViewController extends BaseController {
  async list(workspaceId: string): Promise<View[]> {
    await this.assertWorkspaceMember(workspaceId);

    const { data, error } = await this.db
      .from('views')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list views: ${error.message}`);
    }

    return (data ?? []) as View[];
  }

  async getById(workspaceId: string, viewId: string): Promise<View | null> {
    await this.assertWorkspaceMember(workspaceId);

    const { data, error } = await this.db
      .from('views')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', viewId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get view: ${error.message}`);
    }

    return data as View | null;
  }

  async create(
    workspaceId: string,
    input: ViewCreateInput,
    ctx: CorrelationContext
  ): Promise<{ view: View; correlation_id: string; outbox_event_id: string | null }> {
    await this.assertWorkspaceMember(workspaceId);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<View>(
      workspaceId,
      ENTITY_TOPICS.VIEW_CREATED,
      { name: input.name, scope: input.scope },
      ctx,
      'create_view',
      {
        name: input.name,
        scope: input.scope,
        layout: input.layout ?? 'list',
        team_id: input.team_id ?? null,
        epic_id: input.epic_id ?? null,
        owner_id: input.owner_id ?? this.userId,
        description: input.description ?? null,
        filter_ast: input.filter_ast ?? {},
        display_options: input.display_options ?? {},
        grouping: input.grouping ?? null,
        sub_grouping: input.sub_grouping ?? null,
        is_shared: input.is_shared ?? false,
      }
    );

    return { view: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async update(
    workspaceId: string,
    viewId: string,
    input: ViewUpdateInput,
    ctx: CorrelationContext
  ): Promise<{ view: View; correlation_id: string; outbox_event_id: string | null }> {
    await this.assertWorkspaceMember(workspaceId);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<View>(
      workspaceId,
      ENTITY_TOPICS.VIEW_UPDATED,
      { view_id: viewId, patch: input },
      ctx,
      'update_view',
      {
        view_id: viewId,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.layout !== undefined ? { layout: input.layout } : {}),
        ...(input.filter_ast !== undefined ? { filter_ast: input.filter_ast } : {}),
        ...(input.display_options !== undefined ? { display_options: input.display_options } : {}),
        ...(input.grouping !== undefined ? { grouping: input.grouping } : {}),
        ...(input.sub_grouping !== undefined ? { sub_grouping: input.sub_grouping } : {}),
        ...(input.is_shared !== undefined ? { is_shared: input.is_shared } : {}),
        ...(input.is_favorited !== undefined ? { is_favorited: input.is_favorited } : {}),
      }
    );

    return { view: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async delete(
    workspaceId: string,
    viewId: string,
    ctx: CorrelationContext
  ): Promise<{ correlation_id: string; outbox_event_id: string | null }> {
    await this.assertWorkspaceMember(workspaceId);

    const { outbox_event_id } = await this.mutateWithOutbox<View>(
      workspaceId,
      ENTITY_TOPICS.VIEW_DELETED,
      { view_id: viewId },
      ctx,
      'delete_view',
      { view_id: viewId }
    );

    return { correlation_id: ctx.correlation_id, outbox_event_id };
  }
}
