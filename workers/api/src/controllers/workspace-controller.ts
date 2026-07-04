import { ENTITY_TOPICS } from '@landi-flow/core/events';
import type { CorrelationContext, Workspace } from '@landi-flow/core/types';
import { persistOutboxEvent } from '../lib/outbox-emitter.js';
import { BaseController } from './base-controller.js';

export interface WorkspaceCreateInput {
  slug: string;
  name: string;
  icon_url?: string | null;
  settings?: Record<string, unknown>;
}

export interface WorkspaceUpdateInput {
  name?: string;
  icon_url?: string | null;
  settings?: Record<string, unknown>;
}

export class WorkspaceController extends BaseController {
  async list(ctx: CorrelationContext): Promise<Workspace[]> {
    const { data, error } = await this.db
      .from('workspaces')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list workspaces: ${error.message}`);
    }

    return (data ?? []) as Workspace[];
  }

  async getById(workspaceId: string): Promise<Workspace | null> {
    const { data, error } = await this.db
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get workspace: ${error.message}`);
    }

    return data as Workspace | null;
  }

  async create(
    input: WorkspaceCreateInput,
    ctx: CorrelationContext
  ): Promise<{ workspace: Workspace; correlation_id: string; outbox_event_id: string | null }> {
    const row = {
      slug: input.slug,
      name: input.name,
      icon_url: input.icon_url ?? null,
      settings: input.settings ?? {},
    };

    const { data, error } = await this.db.from('workspaces').insert(row).select('*').single();
    if (error) {
      throw new Error(`Failed to create workspace: ${error.message}`);
    }

    const workspace = data as Workspace;
    const emit = this.prepareOnly(
      workspace.id,
      ENTITY_TOPICS.WORKSPACE_CREATED,
      { workspace_id: workspace.id, slug: workspace.slug, name: workspace.name },
      ctx
    );

    let outbox_event_id: string | null = null;
    if (emit) {
      outbox_event_id = await persistOutboxEvent(this.db, emit);
    }

    return { workspace, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async update(
    workspaceId: string,
    input: WorkspaceUpdateInput,
    ctx: CorrelationContext
  ): Promise<{ workspace: Workspace; correlation_id: string; outbox_event_id: string | null }> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.icon_url !== undefined) patch.icon_url = input.icon_url;
    if (input.settings !== undefined) patch.settings = input.settings;

    const { result, outbox_event_id } = await this.mutateWithOutbox(
      workspaceId,
      ENTITY_TOPICS.WORKSPACE_UPDATED,
      { workspace_id: workspaceId, patch },
      ctx,
      async () => {
        const { data, error } = await this.db
          .from('workspaces')
          .update(patch)
          .eq('id', workspaceId)
          .select('*')
          .single();

        if (error) {
          throw new Error(`Failed to update workspace: ${error.message}`);
        }
        return data as Workspace;
      }
    );

    return { workspace: result, correlation_id: ctx.correlation_id, outbox_event_id };
  }
}
