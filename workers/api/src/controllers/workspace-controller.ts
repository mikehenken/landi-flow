import { ENTITY_TOPICS } from '@landi-flow/core/events';
import type { CorrelationContext, Workspace } from '@landi-flow/core/types';
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
    const { data: memberships, error: membershipError } = await this.db
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', this.userId)
      .eq('status', 'active');

    if (membershipError) {
      throw new Error(`Failed to list workspace memberships: ${membershipError.message}`);
    }

    const workspaceIds = (memberships ?? []).map((m: { workspace_id: string }) => m.workspace_id);
    if (workspaceIds.length === 0) {
      return [];
    }

    const { data, error } = await this.db
      .from('workspaces')
      .select('*')
      .in('id', workspaceIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list workspaces: ${error.message}`);
    }

    return (data ?? []) as Workspace[];
  }

  async getById(workspaceId: string): Promise<Workspace | null> {
    await this.assertWorkspaceMember(workspaceId);

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
    const { entity, outbox_event_id } = await this.mutateWithOutboxNullableWorkspace<Workspace>(
      ENTITY_TOPICS.WORKSPACE_CREATED,
      { slug: input.slug, name: input.name },
      ctx,
      'create_workspace',
      {
        slug: input.slug,
        name: input.name,
        icon_url: input.icon_url ?? null,
        settings: input.settings ?? {},
        creator_user_id: this.userId,
      }
    );

    return { workspace: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async update(
    workspaceId: string,
    input: WorkspaceUpdateInput,
    ctx: CorrelationContext
  ): Promise<{ workspace: Workspace; correlation_id: string; outbox_event_id: string | null }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<Workspace>(
      workspaceId,
      ENTITY_TOPICS.WORKSPACE_UPDATED,
      { workspace_id: workspaceId, patch: input },
      ctx,
      'update_workspace',
      {
        workspace_id: workspaceId,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.icon_url !== undefined ? { icon_url: input.icon_url } : {}),
        ...(input.settings !== undefined ? { settings: input.settings } : {}),
      }
    );

    return { workspace: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }
}
