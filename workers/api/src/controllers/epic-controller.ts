import { ENTITY_TOPICS } from '@landi-flow/core/events';
import type { CorrelationContext, Epic, EpicPriority } from '@landi-flow/core/types';
import { BaseController } from './base-controller.js';

export interface EpicCreateInput {
  name: string;
  slug: string;
  status_id: string;
  description_md?: string | null;
  priority?: EpicPriority;
  lead_id?: string | null;
  start_date?: string | null;
  target_date?: string | null;
  team_ids?: string[];
}

export interface EpicUpdateInput {
  name?: string;
  description_md?: string | null;
  status_id?: string;
  priority?: EpicPriority;
  lead_id?: string | null;
  start_date?: string | null;
  target_date?: string | null;
}

export class EpicController extends BaseController {
  async list(workspaceId: string): Promise<Epic[]> {
    const { data, error } = await this.db
      .from('epics')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('archived_at', null)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list epics: ${error.message}`);
    }

    return (data ?? []) as Epic[];
  }

  async getById(workspaceId: string, epicId: string): Promise<Epic | null> {
    const { data, error } = await this.db
      .from('epics')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', epicId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get epic: ${error.message}`);
    }

    return data as Epic | null;
  }

  async create(
    workspaceId: string,
    input: EpicCreateInput,
    ctx: CorrelationContext,
    createdBy?: string | null
  ): Promise<{ epic: Epic; correlation_id: string; outbox_event_id: string | null }> {
    const row = {
      workspace_id: workspaceId,
      name: input.name,
      slug: input.slug,
      status_id: input.status_id,
      description_md: input.description_md ?? null,
      priority: input.priority ?? 'none',
      lead_id: input.lead_id ?? null,
      start_date: input.start_date ?? null,
      target_date: input.target_date ?? null,
      created_by: createdBy ?? null,
      correlation_id: ctx.correlation_id,
    };

    const { result, outbox_event_id } = await this.mutateWithOutbox(
      workspaceId,
      ENTITY_TOPICS.EPIC_CREATED,
      { epic_slug: input.slug, name: input.name },
      ctx,
      async () => {
        const { data, error } = await this.db.from('epics').insert(row).select('*').single();
        if (error) {
          throw new Error(`Failed to create epic: ${error.message}`);
        }

        const epic = data as Epic;
        if (input.team_ids && input.team_ids.length > 0) {
          const junction = input.team_ids.map((team_id) => ({
            epic_id: epic.id,
            team_id,
          }));
          const { error: junctionError } = await this.db.from('epic_teams').insert(junction);
          if (junctionError) {
            throw new Error(`Failed to link epic teams: ${junctionError.message}`);
          }
        }

        return epic;
      }
    );

    return { epic: result, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async update(
    workspaceId: string,
    epicId: string,
    input: EpicUpdateInput,
    ctx: CorrelationContext
  ): Promise<{ epic: Epic; correlation_id: string; outbox_event_id: string | null }> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.description_md !== undefined) patch.description_md = input.description_md;
    if (input.status_id !== undefined) patch.status_id = input.status_id;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.lead_id !== undefined) patch.lead_id = input.lead_id;
    if (input.start_date !== undefined) patch.start_date = input.start_date;
    if (input.target_date !== undefined) patch.target_date = input.target_date;

    const { result, outbox_event_id } = await this.mutateWithOutbox(
      workspaceId,
      ENTITY_TOPICS.EPIC_UPDATED,
      { epic_id: epicId, patch },
      ctx,
      async () => {
        const { data, error } = await this.db
          .from('epics')
          .update(patch)
          .eq('workspace_id', workspaceId)
          .eq('id', epicId)
          .select('*')
          .single();

        if (error) {
          throw new Error(`Failed to update epic: ${error.message}`);
        }
        return data as Epic;
      }
    );

    return { epic: result, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async setTeams(workspaceId: string, epicId: string, teamIds: string[]): Promise<void> {
    const { error: deleteError } = await this.db
      .from('epic_teams')
      .delete()
      .eq('epic_id', epicId);

    if (deleteError) {
      throw new Error(`Failed to clear epic teams: ${deleteError.message}`);
    }

    if (teamIds.length === 0) {
      return;
    }

    const rows = teamIds.map((team_id) => ({ epic_id: epicId, team_id }));
    const { error } = await this.db.from('epic_teams').insert(rows);
    if (error) {
      throw new Error(`Failed to set epic teams: ${error.message}`);
    }
  }
}
