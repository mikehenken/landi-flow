import type { CorrelationContext, EpicStatusCategory, Team, WorkflowState } from '@landi-flow/core/types';
import { BaseController } from './base-controller.js';

export interface EpicStatusRow {
  id: string;
  workspace_id: string;
  name: string;
  category: EpicStatusCategory;
  position: number;
  color: string | null;
}

export class TeamController extends BaseController {
  async list(workspaceId: string): Promise<Team[]> {
    await this.assertWorkspaceMember(workspaceId);

    const { data, error } = await this.db
      .from('teams')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to list teams: ${error.message}`);
    }

    return (data ?? []) as Team[];
  }

  async listWorkflowStates(
    workspaceId: string,
    teamId: string,
  ): Promise<WorkflowState[]> {
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

  async listEpicStatuses(workspaceId: string): Promise<EpicStatusRow[]> {
    await this.assertWorkspaceMember(workspaceId);

    const { error: seedError } = await this.db.rpc('ensure_default_epic_statuses', {
      p_workspace_id: workspaceId,
    });
    if (seedError) {
      throw new Error(`Failed to ensure default epic statuses: ${seedError.message}`);
    }

    const { data, error } = await this.db
      .from('epic_statuses')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true });

    if (error) {
      throw new Error(`Failed to list epic statuses: ${error.message}`);
    }

    return (data ?? []) as EpicStatusRow[];
  }

  async getDefaultTeam(workspaceId: string): Promise<Team | null> {
    const teams = await this.list(workspaceId);
    return teams[0] ?? null;
  }

  async getDefaultEpicStatusId(
    workspaceId: string,
    category: EpicStatusCategory = 'backlog',
  ): Promise<string | null> {
    const statuses = await this.listEpicStatuses(workspaceId);
    const match = statuses.find((row) => row.category === category);
    return match?.id ?? statuses[0]?.id ?? null;
  }

  async getDefaultWorkflowStateId(
    workspaceId: string,
    teamId: string,
    category: WorkflowState['category'] = 'unstarted',
  ): Promise<string | null> {
    const states = await this.listWorkflowStates(workspaceId, teamId);
    const match = states.find((row) => row.category === category);
    return match?.id ?? states[0]?.id ?? null;
  }

  /** Ensures a default team exists so inbox hydration can load stories for new workspaces. */
  async ensureDefaultTeam(workspaceId: string): Promise<Team> {
    const existing = await this.getDefaultTeam(workspaceId);
    if (existing) {
      return existing;
    }

    await this.assertWorkspaceMember(workspaceId);

    const { data: team, error: teamError } = await this.db
      .from('teams')
      .insert({
        workspace_id: workspaceId,
        slug: 'general',
        name: 'General',
        key: 'GEN',
        visibility: 'public',
      })
      .select('*')
      .single();

    if (teamError || !team) {
      throw new Error(`Failed to create default team: ${teamError?.message ?? 'unknown error'}`);
    }

    const { error: memberError } = await this.db.from('team_members').insert({
      team_id: team.id,
      user_id: this.userId,
      role: 'owner',
      status: 'active',
    });

    if (memberError) {
      throw new Error(`Failed to add creator to default team: ${memberError.message}`);
    }

    const { error: seedError } = await this.db.rpc('ensure_default_workflow_states', {
      p_team_id: team.id,
    });
    if (seedError) {
      throw new Error(`Failed to seed default workflow states: ${seedError.message}`);
    }

    return team as Team;
  }

  /** Bootstrap team + default workflow/epic status ids for the frontend hydrator. */
  async ensureWorkspaceDefaults(
    workspaceId: string,
    _ctx: CorrelationContext,
  ): Promise<{ team_id: string | null; default_workflow_state_id: string | null; default_epic_status_id: string | null }> {
    const team = await this.ensureDefaultTeam(workspaceId);

    const [defaultWorkflowStateId, defaultEpicStatusId] = await Promise.all([
      this.getDefaultWorkflowStateId(workspaceId, team.id),
      this.getDefaultEpicStatusId(workspaceId),
    ]);

    return {
      team_id: team.id,
      default_workflow_state_id: defaultWorkflowStateId,
      default_epic_status_id: defaultEpicStatusId,
    };
  }
}
