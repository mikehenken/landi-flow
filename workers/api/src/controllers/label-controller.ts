import type { CorrelationContext, EpicLabelCatalogEntry, StoryLabel } from '@landi-flow/core/types';
import { BaseController } from './base-controller.js';

export interface StoryLabelCreateInput {
  name: string;
  color?: string | null;
  description?: string | null;
  group_name?: string | null;
  team_id?: string | null;
}

export interface StoryLabelUpdateInput {
  name?: string;
  color?: string | null;
  description?: string | null;
  group_name?: string | null;
  team_id?: string | null;
}

export interface EpicLabelCreateInput {
  name: string;
  color?: string | null;
}

export interface EpicLabelUpdateInput {
  name?: string;
  color?: string | null;
}

export class StoryLabelController extends BaseController {
  async list(workspaceId: string): Promise<StoryLabel[]> {
    await this.assertWorkspaceMember(workspaceId);

    const { data, error } = await this.db
      .from('labels')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to list story labels: ${error.message}`);
    }

    return (data ?? []) as StoryLabel[];
  }

  async create(
    workspaceId: string,
    input: StoryLabelCreateInput,
    ctx: CorrelationContext,
  ): Promise<{ label: StoryLabel; correlation_id: string }> {
    await this.assertWorkspaceMember(workspaceId);

    const { data, error } = await this.db
      .from('labels')
      .insert({
        workspace_id: workspaceId,
        name: input.name.trim(),
        color: input.color ?? null,
        description: input.description ?? null,
        group_name: input.group_name ?? null,
        team_id: input.team_id ?? null,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create story label: ${error?.message ?? 'unknown error'}`);
    }

    return { label: data as StoryLabel, correlation_id: ctx.correlation_id };
  }

  async update(
    workspaceId: string,
    labelId: string,
    input: StoryLabelUpdateInput,
    ctx: CorrelationContext,
  ): Promise<{ label: StoryLabel; correlation_id: string }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) {
      patch.name = input.name.trim();
    }
    if (input.color !== undefined) {
      patch.color = input.color;
    }
    if (input.description !== undefined) {
      patch.description = input.description;
    }
    if (input.group_name !== undefined) {
      patch.group_name = input.group_name;
    }
    if (input.team_id !== undefined) {
      patch.team_id = input.team_id;
    }

    const { data, error } = await this.db
      .from('labels')
      .update(patch)
      .eq('workspace_id', workspaceId)
      .eq('id', labelId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to update story label: ${error?.message ?? 'unknown error'}`);
    }

    return { label: data as StoryLabel, correlation_id: ctx.correlation_id };
  }

  async delete(
    workspaceId: string,
    labelId: string,
    ctx: CorrelationContext,
  ): Promise<{ ok: true; correlation_id: string }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { error } = await this.db
      .from('labels')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('id', labelId);

    if (error) {
      throw new Error(`Failed to delete story label: ${error.message}`);
    }

    return { ok: true, correlation_id: ctx.correlation_id };
  }
}

export class EpicLabelCatalogController extends BaseController {
  async list(workspaceId: string): Promise<EpicLabelCatalogEntry[]> {
    await this.assertWorkspaceMember(workspaceId);

    const { data, error } = await this.db
      .from('epic_labels_catalog')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to list epic labels: ${error.message}`);
    }

    return (data ?? []) as EpicLabelCatalogEntry[];
  }

  async create(
    workspaceId: string,
    input: EpicLabelCreateInput,
    ctx: CorrelationContext,
  ): Promise<{ label: EpicLabelCatalogEntry; correlation_id: string }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { data, error } = await this.db
      .from('epic_labels_catalog')
      .insert({
        workspace_id: workspaceId,
        name: input.name.trim(),
        color: input.color ?? null,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create epic label: ${error?.message ?? 'unknown error'}`);
    }

    return { label: data as EpicLabelCatalogEntry, correlation_id: ctx.correlation_id };
  }

  async update(
    workspaceId: string,
    labelId: string,
    input: EpicLabelUpdateInput,
    ctx: CorrelationContext,
  ): Promise<{ label: EpicLabelCatalogEntry; correlation_id: string }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) {
      patch.name = input.name.trim();
    }
    if (input.color !== undefined) {
      patch.color = input.color;
    }

    const { data, error } = await this.db
      .from('epic_labels_catalog')
      .update(patch)
      .eq('workspace_id', workspaceId)
      .eq('id', labelId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to update epic label: ${error?.message ?? 'unknown error'}`);
    }

    return { label: data as EpicLabelCatalogEntry, correlation_id: ctx.correlation_id };
  }

  async delete(
    workspaceId: string,
    labelId: string,
    ctx: CorrelationContext,
  ): Promise<{ ok: true; correlation_id: string }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { error } = await this.db
      .from('epic_labels_catalog')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('id', labelId);

    if (error) {
      throw new Error(`Failed to delete epic label: ${error.message}`);
    }

    return { ok: true, correlation_id: ctx.correlation_id };
  }
}
