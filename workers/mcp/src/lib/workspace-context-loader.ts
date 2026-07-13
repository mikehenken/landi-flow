/**
 * Loads full workspace context from Supabase for MCP tools — one call replaces UUID hunting.
 */
import type { AssignableMember, WorkflowState } from '@landi-flow/core/types';
import type {
  McpEpicStatusRef,
  McpLabelRef,
  McpTeamContext,
  McpTeamWorkflowDefaults,
  McpWorkspaceContext,
} from '@landi-flow/core/mcp';
import {
  resolveDefaultWorkflowStateId,
  resolveWorkflowStateId,
} from '@landi-flow/core/mcp';
import type { DbClient } from './db.js';

interface TeamRow {
  id: string;
  name: string;
  key: string;
  slug: string;
}

interface WorkflowStateRow {
  id: string;
  team_id: string;
  name: string;
  category: WorkflowState['category'];
  position: number;
  is_default: boolean;
}

interface EpicStatusRow {
  id: string;
  name: string;
  category: McpEpicStatusRef['category'];
}

interface LabelRow {
  id: string;
  name: string;
  color: string | null;
}

function buildWorkflowDefaults(states: WorkflowStateRow[]): McpTeamWorkflowDefaults {
  return {
    backlog: resolveWorkflowStateId(states, 'backlog', { intent: 'backlog' }),
    unstarted: states.find((state) => state.category === 'unstarted')?.id ?? null,
    done: resolveWorkflowStateId(states, 'done', { intent: 'complete' }),
    complete: resolveWorkflowStateId(states, 'complete', { intent: 'complete' }),
  };
}

async function ensureDefaultTeam(db: DbClient, workspaceId: string): Promise<TeamRow | null> {
  const { data: teams, error } = await db
    .from('teams')
    .select('id, name, key, slug')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(`Failed to load teams: ${error.message}`);
  }

  return (teams?.[0] as TeamRow | undefined) ?? null;
}

async function loadWorkflowStatesForTeam(
  db: DbClient,
  teamId: string,
): Promise<WorkflowStateRow[]> {
  await db.rpc('ensure_default_workflow_states', { p_team_id: teamId });

  const { data, error } = await db
    .from('workflow_states')
    .select('id, team_id, name, category, position, is_default')
    .eq('team_id', teamId)
    .order('position', { ascending: true });

  if (error) {
    throw new Error(`Failed to load workflow states: ${error.message}`);
  }

  return (data ?? []) as WorkflowStateRow[];
}

async function loadEpicStatuses(db: DbClient, workspaceId: string): Promise<McpEpicStatusRef[]> {
  await db.rpc('ensure_default_epic_statuses', { p_workspace_id: workspaceId });

  const { data, error } = await db
    .from('epic_statuses')
    .select('id, name, category')
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: true });

  if (error) {
    throw new Error(`Failed to load epic statuses: ${error.message}`);
  }

  return ((data ?? []) as EpicStatusRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    slug: row.category.replace(/_/g, '-'),
  }));
}

async function loadLabels(db: DbClient, workspaceId: string): Promise<McpLabelRef[]> {
  const { data, error } = await db
    .from('labels')
    .select('id, name, color')
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to load labels: ${error.message}`);
  }

  return (data ?? []) as LabelRow[];
}

async function loadMembers(db: DbClient, workspaceId: string): Promise<AssignableMember[]> {
  const { data, error } = await db.rpc('list_assignable_members', {
    p_workspace_id: workspaceId,
  });
  if (error) {
    throw new Error(`Failed to load members: ${error.message}`);
  }
  return Array.isArray(data) ? (data as AssignableMember[]) : [];
}

async function loadMemberId(
  db: DbClient,
  workspaceId: string,
  userId: string | null,
): Promise<string | null> {
  if (!userId) {
    return null;
  }
  const { data, error } = await db
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load member id: ${error.message}`);
  }
  return (data as { id: string } | null)?.id ?? null;
}

export async function loadMcpWorkspaceContext(
  db: DbClient,
  workspaceId: string,
  userId: string | null,
): Promise<McpWorkspaceContext> {
  const { data: workspace, error: workspaceError } = await db
    .from('workspaces')
    .select('id, name, slug')
    .eq('id', workspaceId)
    .maybeSingle();

  if (workspaceError) {
    throw new Error(`Failed to load workspace: ${workspaceError.message}`);
  }
  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  const { data: teamRows, error: teamsError } = await db
    .from('teams')
    .select('id, name, key, slug')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (teamsError) {
    throw new Error(`Failed to list teams: ${teamsError.message}`);
  }

  let teams = (teamRows ?? []) as TeamRow[];
  if (teams.length === 0) {
    const fallback = await ensureDefaultTeam(db, workspaceId);
    if (fallback) {
      teams = [fallback];
    }
  }

  const teamContexts: McpTeamContext[] = [];
  for (const team of teams) {
    const states = await loadWorkflowStatesForTeam(db, team.id);
    const defaultWorkflowStateId = resolveDefaultWorkflowStateId(null, states);
    const completedWorkflowStateId =
      resolveWorkflowStateId(states, 'done', { intent: 'complete' }) ?? null;

    teamContexts.push({
      ...team,
      workflow_states: states.map((state) => ({
        id: state.id,
        name: state.name,
        category: state.category,
        team_id: state.team_id,
      })),
      default_workflow_state_id: defaultWorkflowStateId,
      completed_workflow_state_id: completedWorkflowStateId,
      workflow_defaults: buildWorkflowDefaults(states),
    });
  }

  const defaultTeam = teamContexts[0] ?? null;
  const epicStatuses = await loadEpicStatuses(db, workspaceId);
  const defaultEpicStatusId =
    epicStatuses.find((status) => status.category === 'backlog')?.id ??
    epicStatuses.find((status) => status.category === 'planned')?.id ??
    epicStatuses[0]?.id ??
    null;
  const completedEpicStatusId =
    epicStatuses.find((status) => status.category === 'completed')?.id ?? null;

  const [labels, members, memberId] = await Promise.all([
    loadLabels(db, workspaceId),
    loadMembers(db, workspaceId),
    loadMemberId(db, workspaceId, userId),
  ]);

  return {
    workspace_id: workspace.id,
    workspace_name: workspace.name,
    workspace_slug: workspace.slug,
    teams: teamContexts,
    default_team_id: defaultTeam?.id ?? null,
    epic_statuses: epicStatuses,
    default_epic_status_id: defaultEpicStatusId,
    completed_epic_status_id: completedEpicStatusId,
    labels,
    member_id: memberId,
    members,
  };
}
