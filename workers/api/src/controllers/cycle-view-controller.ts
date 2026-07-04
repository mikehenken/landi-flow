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
  private async nextCycleNumber(teamId: string): Promise<number> {
    const { data, error } = await this.db
      .from('cycles')
      .select('number')
      .eq('team_id', teamId)
      .order('number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to allocate cycle number: ${error.message}`);
    }

    return ((data as { number: number } | null)?.number ?? 0) + 1;
  }

  async list(workspaceId: string, teamId: string): Promise<Cycle[]> {
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
    const number = await this.nextCycleNumber(teamId);
    const row = {
      workspace_id: workspaceId,
      team_id: teamId,
      name: input.name,
      number,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      settings: input.settings ?? {},
    };

    const { result, outbox_event_id } = await this.mutateWithOutbox(
      workspaceId,
      ENTITY_TOPICS.CYCLE_STARTED,
      { team_id: teamId, cycle_number: number, name: input.name },
      ctx,
      async () => {
        const { data, error } = await this.db.from('cycles').insert(row).select('*').single();
        if (error) {
          throw new Error(`Failed to create cycle: ${error.message}`);
        }
        return data as Cycle;
      }
    );

    return { cycle: result, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async update(
    workspaceId: string,
    teamId: string,
    cycleId: string,
    input: CycleUpdateInput,
    ctx: CorrelationContext
  ): Promise<{ cycle: Cycle; correlation_id: string; outbox_event_id: string | null }> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.starts_at !== undefined) patch.starts_at = input.starts_at;
    if (input.ends_at !== undefined) patch.ends_at = input.ends_at;
    if (input.settings !== undefined) patch.settings = input.settings;

    const { result, outbox_event_id } = await this.mutateWithOutbox(
      workspaceId,
      ENTITY_TOPICS.CYCLE_UPDATED,
      { cycle_id: cycleId, team_id: teamId, patch },
      ctx,
      async () => {
        const { data, error } = await this.db
          .from('cycles')
          .update(patch)
          .eq('workspace_id', workspaceId)
          .eq('team_id', teamId)
          .eq('id', cycleId)
          .select('*')
          .single();

        if (error) {
          throw new Error(`Failed to update cycle: ${error.message}`);
        }
        return data as Cycle;
      }
    );

    return { cycle: result, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async complete(
    workspaceId: string,
    teamId: string,
    cycleId: string,
    ctx: CorrelationContext
  ): Promise<{ cycle: Cycle; correlation_id: string; outbox_event_id: string | null }> {
    const { result, outbox_event_id } = await this.mutateWithOutbox(
      workspaceId,
      ENTITY_TOPICS.CYCLE_UPDATED,
      { cycle_id: cycleId, action: 'completed' },
      ctx,
      async () => {
        const { data, error } = await this.db
          .from('cycles')
          .update({ completed_at: new Date().toISOString() })
          .eq('workspace_id', workspaceId)
          .eq('team_id', teamId)
          .eq('id', cycleId)
          .select('*')
          .single();

        if (error) {
          throw new Error(`Failed to complete cycle: ${error.message}`);
        }
        return data as Cycle;
      }
    );

    return { cycle: result, correlation_id: ctx.correlation_id, outbox_event_id };
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
    const row = {
      workspace_id: workspaceId,
      name: input.name,
      scope: input.scope,
      layout: input.layout ?? 'list',
      team_id: input.team_id ?? null,
      epic_id: input.epic_id ?? null,
      owner_id: input.owner_id ?? null,
      description: input.description ?? null,
      filter_ast: input.filter_ast ?? {},
      display_options: input.display_options ?? {},
      grouping: input.grouping ?? null,
      sub_grouping: input.sub_grouping ?? null,
      is_shared: input.is_shared ?? false,
    };

    const { result, outbox_event_id } = await this.mutateWithOutbox(
      workspaceId,
      ENTITY_TOPICS.VIEW_CREATED,
      { name: input.name, scope: input.scope },
      ctx,
      async () => {
        const { data, error } = await this.db.from('views').insert(row).select('*').single();
        if (error) {
          throw new Error(`Failed to create view: ${error.message}`);
        }
        return data as View;
      }
    );

    return { view: result, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async update(
    workspaceId: string,
    viewId: string,
    input: ViewUpdateInput,
    ctx: CorrelationContext
  ): Promise<{ view: View; correlation_id: string; outbox_event_id: string | null }> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.layout !== undefined) patch.layout = input.layout;
    if (input.filter_ast !== undefined) patch.filter_ast = input.filter_ast;
    if (input.display_options !== undefined) patch.display_options = input.display_options;
    if (input.grouping !== undefined) patch.grouping = input.grouping;
    if (input.sub_grouping !== undefined) patch.sub_grouping = input.sub_grouping;
    if (input.is_shared !== undefined) patch.is_shared = input.is_shared;
    if (input.is_favorited !== undefined) patch.is_favorited = input.is_favorited;

    const { result, outbox_event_id } = await this.mutateWithOutbox(
      workspaceId,
      ENTITY_TOPICS.VIEW_UPDATED,
      { view_id: viewId, patch },
      ctx,
      async () => {
        const { data, error } = await this.db
          .from('views')
          .update(patch)
          .eq('workspace_id', workspaceId)
          .eq('id', viewId)
          .select('*')
          .single();

        if (error) {
          throw new Error(`Failed to update view: ${error.message}`);
        }
        return data as View;
      }
    );

    return { view: result, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async delete(
    workspaceId: string,
    viewId: string,
    ctx: CorrelationContext
  ): Promise<{ correlation_id: string; outbox_event_id: string | null }> {
    const { outbox_event_id } = await this.mutateWithOutbox(
      workspaceId,
      ENTITY_TOPICS.VIEW_DELETED,
      { view_id: viewId },
      ctx,
      async () => {
        const { error } = await this.db
          .from('views')
          .delete()
          .eq('workspace_id', workspaceId)
          .eq('id', viewId);

        if (error) {
          throw new Error(`Failed to delete view: ${error.message}`);
        }
        return null;
      }
    );

    return { correlation_id: ctx.correlation_id, outbox_event_id };
  }
}
