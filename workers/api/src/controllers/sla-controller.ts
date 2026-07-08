import type { CorrelationContext, SlaRule, StoryPriority } from '@landi-flow/core/types';
import { BaseController } from './base-controller.js';

export interface SlaCreateInput {
  name: string;
  team_id?: string | null;
  rules: SlaRule['rules'];
}

export interface SlaUpdateInput {
  name?: string;
  team_id?: string | null;
  rules?: SlaRule['rules'];
}

interface SlaRow {
  id: string;
  workspace_id: string;
  team_id: string | null;
  name: string;
  rules: SlaRule['rules'];
  created_at: string;
  updated_at: string;
}

export interface StorySlaStatus {
  story_id: string;
  sla_id: string | null;
  sla_due_at: string | null;
  breached: boolean;
  due_in_hours: number | null;
}

export function computeSlaDueAt(
  createdAt: string,
  rules: SlaRule['rules'],
): string | null {
  const hours = rules.resolution_hours ?? rules.response_hours;
  if (!hours || hours <= 0) {
    return null;
  }
  const due = new Date(createdAt);
  due.setHours(due.getHours() + hours);
  return due.toISOString();
}

export function isSlaBreached(dueAt: string | null): boolean {
  if (!dueAt) {
    return false;
  }
  return new Date(dueAt).getTime() < Date.now();
}

export class SlaController extends BaseController {
  async list(workspaceId: string): Promise<SlaRule[]> {
    await this.assertWorkspaceMember(workspaceId);

    const { data, error } = await this.db
      .from('slas')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list SLA rules: ${error.message}`);
    }

    return (data ?? []) as SlaRule[];
  }

  async create(
    workspaceId: string,
    input: SlaCreateInput,
    ctx: CorrelationContext,
  ): Promise<{ sla: SlaRule; correlation_id: string }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { data, error } = await this.db
      .from('slas')
      .insert({
        workspace_id: workspaceId,
        name: input.name,
        team_id: input.team_id ?? null,
        rules: input.rules,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create SLA rule: ${error?.message ?? 'unknown error'}`);
    }

    return { sla: data as SlaRule, correlation_id: ctx.correlation_id };
  }

  async update(
    workspaceId: string,
    slaId: string,
    input: SlaUpdateInput,
    ctx: CorrelationContext,
  ): Promise<{ sla: SlaRule; correlation_id: string }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) {
      patch.name = input.name;
    }
    if (input.team_id !== undefined) {
      patch.team_id = input.team_id;
    }
    if (input.rules !== undefined) {
      patch.rules = input.rules;
    }

    const { data, error } = await this.db
      .from('slas')
      .update(patch)
      .eq('workspace_id', workspaceId)
      .eq('id', slaId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to update SLA rule: ${error?.message ?? 'unknown error'}`);
    }

    return { sla: data as SlaRule, correlation_id: ctx.correlation_id };
  }

  async delete(
    workspaceId: string,
    slaId: string,
    ctx: CorrelationContext,
  ): Promise<{ ok: true; correlation_id: string }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { error } = await this.db
      .from('slas')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('id', slaId);

    if (error) {
      throw new Error(`Failed to delete SLA rule: ${error.message}`);
    }

    return { ok: true, correlation_id: ctx.correlation_id };
  }

  async getStorySlaStatus(
    workspaceId: string,
    storyId: string,
  ): Promise<StorySlaStatus> {
    await this.assertWorkspaceMember(workspaceId);

    const { data: story, error } = await this.db
      .from('stories')
      .select('id, sla_id, sla_due_at, created_at, priority')
      .eq('workspace_id', workspaceId)
      .eq('id', storyId)
      .maybeSingle();

    if (error || !story) {
      throw new Error(`Story not found for SLA status: ${error?.message ?? storyId}`);
    }

    const row = story as {
      id: string;
      sla_id: string | null;
      sla_due_at: string | null;
      created_at: string;
      priority: StoryPriority;
    };

    let dueAt = row.sla_due_at;
    if (!dueAt && row.sla_id) {
      const { data: sla } = await this.db
        .from('slas')
        .select('rules')
        .eq('id', row.sla_id)
        .maybeSingle();
      const rules = (sla as { rules?: SlaRule['rules'] } | null)?.rules;
      if (rules) {
        dueAt = computeSlaDueAt(row.created_at, rules);
      }
    }

    const breached = isSlaBreached(dueAt);
    const dueInHours =
      dueAt !== null
        ? Math.round((new Date(dueAt).getTime() - Date.now()) / (1000 * 60 * 60))
        : null;

    return {
      story_id: row.id,
      sla_id: row.sla_id,
      sla_due_at: dueAt,
      breached,
      due_in_hours: dueInHours,
    };
  }
}
