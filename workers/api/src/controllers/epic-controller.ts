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
    await this.assertWorkspaceMember(workspaceId);

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
    await this.assertWorkspaceMember(workspaceId);

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
    ctx: CorrelationContext
  ): Promise<{ epic: Epic; correlation_id: string; outbox_event_id: string | null }> {
    await this.assertWorkspaceMember(workspaceId);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<Epic>(
      workspaceId,
      ENTITY_TOPICS.EPIC_CREATED,
      { epic_slug: input.slug, name: input.name },
      ctx,
      'create_epic',
      {
        name: input.name,
        slug: input.slug,
        status_id: input.status_id,
        description_md: input.description_md ?? null,
        priority: input.priority ?? 'none',
        lead_id: input.lead_id ?? null,
        start_date: input.start_date ?? null,
        target_date: input.target_date ?? null,
        created_by: this.userId,
        team_ids: input.team_ids ?? [],
      }
    );

    return { epic: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async update(
    workspaceId: string,
    epicId: string,
    input: EpicUpdateInput,
    ctx: CorrelationContext
  ): Promise<{ epic: Epic; correlation_id: string; outbox_event_id: string | null }> {
    await this.assertWorkspaceMember(workspaceId);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<Epic>(
      workspaceId,
      ENTITY_TOPICS.EPIC_UPDATED,
      { epic_id: epicId, patch: input },
      ctx,
      'update_epic',
      {
        epic_id: epicId,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description_md !== undefined ? { description_md: input.description_md } : {}),
        ...(input.status_id !== undefined ? { status_id: input.status_id } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.lead_id !== undefined ? { lead_id: input.lead_id } : {}),
        ...(input.start_date !== undefined ? { start_date: input.start_date } : {}),
        ...(input.target_date !== undefined ? { target_date: input.target_date } : {}),
      }
    );

    return { epic: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async setTeams(workspaceId: string, epicId: string, teamIds: string[]): Promise<void> {
    await this.assertWorkspaceMember(workspaceId);

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
