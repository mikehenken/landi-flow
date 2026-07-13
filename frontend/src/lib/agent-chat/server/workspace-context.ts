// Server-only. Loads workspace team context for agent chat (system prompt + tool arg injection).
import type { EpicStatusCategory, WorkflowState } from '@landi-flow/core/types';
import {
  enrichToolInputWithWorkspaceContext,
  isUuid,
  resolveTeamIdFromRoster,
  resolveWorkflowStateId,
  validateEnrichedToolInput,
  type AgentWorkspaceContext,
} from '@landi-flow/core/mcp';
import { resolveEpicStatusId } from '@/lib/resolve-epic-status-id';
import { fetchFlowApiUpstream } from '@/lib/api/upstream-fetch';
import { EPIC_STATUS_LABELS } from '@/lib/epic-status';
import { DEMO_TEAM_ID, DEMO_WORKFLOW_STATE_ROWS } from '@/lib/seed-data';
import { resolveDefaultWorkflowStateId } from '@/lib/workflow-state-defaults';

export type { AgentWorkspaceContext };

export {
  enrichToolInputWithWorkspaceContext,
  isUuid,
  resolveTeamIdFromRoster,
  resolveWorkflowStateId,
  validateEnrichedToolInput,
};
export { resolveEpicStatusId };

interface ContextDefaultsResponse {
  team_id: string | null;
  default_workflow_state_id: string | null;
  default_epic_status_id: string | null;
}

interface TeamRow {
  id: string;
  name: string;
  key: string;
  slug: string;
}

interface EpicStatusRow {
  id: string;
  name: string;
  category: EpicStatusCategory;
}

async function fetchJson<T>(path: string, accessToken: string): Promise<T | null> {
  const response = await fetchFlowApiUpstream(path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as T;
}

/** Deterministic agent context for mock/demo workspaces when the API roster is unavailable. */
export function buildMockAgentWorkspaceContext(workspaceId: string): AgentWorkspaceContext {
  const teams: AgentWorkspaceContext['teams'] = [
    {
      id: DEMO_TEAM_ID,
      name: 'Design',
      key: 'DSN',
      slug: 'team-design',
    },
  ];
  const workflowStates = DEMO_WORKFLOW_STATE_ROWS;
  const epicStatuses = (
    Object.entries(EPIC_STATUS_LABELS) as Array<[EpicStatusCategory, string]>
  ).map(([category, name]) => ({
    id: `epic-status-${category.replace('_', '-')}`,
    name,
    category,
  }));

  return {
    workspaceId,
    teamId: DEMO_TEAM_ID,
    teamName: 'Design',
    teamKey: 'DSN',
    teamSlug: 'team-design',
    defaultWorkflowStateId: workflowStates.find((state) => state.is_default)?.id ?? null,
    defaultEpicStatusId: epicStatuses.find((status) => status.category === 'planned')?.id ?? null,
    completedWorkflowStateId: workflowStates.find((state) => state.category === 'completed')?.id ?? null,
    completedEpicStatusId: epicStatuses.find((status) => status.category === 'completed')?.id ?? null,
    teams,
    workflowStates,
    epicStatuses,
  };
}

/**
 * Resolves the active team and roster for the workspace using the caller's session.
 * Returns `null` when the API is unreachable or the session lacks access.
 */
export async function loadAgentWorkspaceContext(
  workspaceId: string,
  accessToken: string,
): Promise<AgentWorkspaceContext | null> {
  const defaults = await fetchJson<ContextDefaultsResponse>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/context/defaults`,
    accessToken,
  );
  if (!defaults) {
    return null;
  }

  const teamsPayload = await fetchJson<{ data: TeamRow[] }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/teams`,
    accessToken,
  );
  const teams = (teamsPayload?.data ?? []).map((team) => ({
    id: team.id,
    name: team.name,
    key: team.key,
    slug: team.slug,
  }));

  const resolvedDefaultTeamId = resolveTeamIdFromRoster(teams, defaults.team_id);
  const activeTeam = resolvedDefaultTeamId
    ? (teams.find((team) => team.id === resolvedDefaultTeamId) ?? null)
    : (teams[0] ?? null);

  const teamId = activeTeam?.id ?? resolvedDefaultTeamId;
  let workflowStates: WorkflowState[] = [];
  let defaultWorkflowStateId = defaults.default_workflow_state_id;

  if (teamId) {
    const statesPayload = await fetchJson<{ data: WorkflowState[] }>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/workflow-states?team_id=${encodeURIComponent(teamId)}`,
      accessToken,
    );
    workflowStates = statesPayload?.data ?? [];
    defaultWorkflowStateId = resolveDefaultWorkflowStateId(
      defaultWorkflowStateId,
      workflowStates,
    );
  }

  const epicStatusesPayload = await fetchJson<{ data: EpicStatusRow[] }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/epic-statuses`,
    accessToken,
  );
  const epicStatuses = (epicStatusesPayload?.data ?? []).map((status) => ({
    id: status.id,
    name: status.name,
    category: status.category,
  }));

  const defaultEpicStatusId =
    defaults.default_epic_status_id ??
    epicStatuses.find((status) => status.category === 'backlog')?.id ??
    null;

  return {
    workspaceId,
    teamId,
    teamName: activeTeam?.name ?? null,
    teamKey: activeTeam?.key ?? null,
    teamSlug: activeTeam?.slug ?? null,
    defaultWorkflowStateId,
    defaultEpicStatusId,
    completedWorkflowStateId: workflowStates.find((state) => state.category === 'completed')?.id ?? null,
    completedEpicStatusId: epicStatuses.find((status) => status.category === 'completed')?.id ?? null,
    teams,
    workflowStates,
    epicStatuses,
  };
}

/** Build the workspace section appended to the agent system prompt. */
export function buildWorkspaceSystemPromptSection(ctx: AgentWorkspaceContext): string {
  const teamLine =
    ctx.teamId !== null
      ? `- Active team: ${ctx.teamName ?? 'Default'} · team_id=\`${ctx.teamId}\`${ctx.teamKey ? ` (key: ${ctx.teamKey})` : ''}`
      : '- Active team: none configured';

  const workflowStateLine =
    ctx.defaultWorkflowStateId !== null
      ? `- Default workflow state for new stories: workflow_state_id=\`${ctx.defaultWorkflowStateId}\``
      : '- Default workflow state: none configured';

  const completedStoryStateLine =
    ctx.completedWorkflowStateId !== null
      ? `- Completed Story workflow state: workflow_state_id=\`${ctx.completedWorkflowStateId}\``
      : '- Completed Story workflow state: none configured';

  const completedEpicStatusLine =
    ctx.completedEpicStatusId !== null
      ? `- Completed Epic status: status_id=\`${ctx.completedEpicStatusId}\``
      : '- Completed Epic status: none configured';

  const roster =
    ctx.teams.length > 0
      ? ctx.teams
          .map((t) => `  - ${t.name} · team_id=\`${t.id}\`${t.key ? ` (key: ${t.key})` : ''}`)
          .join('\n')
      : '  - (no teams loaded)';

  const workflowRoster =
    ctx.workflowStates.length > 0
      ? ctx.workflowStates
          .map((state) => `  - ${state.name} (${state.category}) · workflow_state_id=\`${state.id}\``)
          .join('\n')
      : '  - (no workflow states loaded)';

  const epicStatusRoster =
    ctx.epicStatuses.length > 0
      ? ctx.epicStatuses
          .map((status) => `  - ${status.name} (${status.category}) · status_id=\`${status.id}\``)
          .join('\n')
      : '  - (no epic statuses loaded)';

  return (
    `\n\n## Active workspace\n` +
    `- workspace_id: \`${ctx.workspaceId}\`\n` +
    `${teamLine}\n` +
    `${workflowStateLine}\n` +
    `${completedStoryStateLine}\n` +
    `${completedEpicStatusLine}\n` +
    `- Teams in workspace:\n${roster}\n` +
    `- Story workflow states (active team):\n${workflowRoster}\n` +
    `- Epic statuses:\n${epicStatusRoster}\n` +
    `\nCall \`workspace.context\` (or use this section) for UUIDs. Slugs, keys, names, and identifiers like LAN-2 are resolved server-side before MCP calls. ` +
    `To mark a **Story** complete, set \`workflow_state_id\` to "done" or the completed state above. ` +
    `To mark an **Epic** complete, use \`epic.update\` with \`status_id\` set to "done" or the completed Epic status above. ` +
    `Never ask the user for team IDs, workflow state IDs, or epic status IDs.`
  );
}
