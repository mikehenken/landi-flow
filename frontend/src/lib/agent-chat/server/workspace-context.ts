// Server-only. Loads workspace team context for agent chat (system prompt + tool arg injection).
import { fetchFlowApiUpstream } from '@/lib/api/upstream-fetch';

export interface AgentWorkspaceContext {
  workspaceId: string;
  teamId: string | null;
  teamName: string | null;
  teamKey: string | null;
  defaultWorkflowStateId: string | null;
  teams: Array<{ id: string; name: string; key: string }>;
}

interface ContextDefaultsResponse {
  team_id: string | null;
  default_workflow_state_id: string | null;
  default_epic_status_id: string | null;
}

interface TeamRow {
  id: string;
  name: string;
  key: string;
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
  }));

  const activeTeam = defaults.team_id
    ? teams.find((team) => team.id === defaults.team_id) ?? null
    : teams[0] ?? null;

  return {
    workspaceId,
    teamId: activeTeam?.id ?? defaults.team_id,
    teamName: activeTeam?.name ?? null,
    teamKey: activeTeam?.key ?? null,
    defaultWorkflowStateId: defaults.default_workflow_state_id,
    teams,
  };
}

/** Build the workspace section appended to the agent system prompt. */
export function buildWorkspaceSystemPromptSection(ctx: AgentWorkspaceContext): string {
  const teamLine =
    ctx.teamId !== null
      ? `- Active team: ${ctx.teamName ?? 'Default'} (${ctx.teamKey ?? '—'}) · team_id=\`${ctx.teamId}\``
      : '- Active team: none configured';

  const roster =
    ctx.teams.length > 0
      ? ctx.teams.map((t) => `  - ${t.name} (${t.key}): \`${t.id}\``).join('\n')
      : '  - (no teams loaded)';

  return (
    `\n\n## Active workspace\n` +
    `- workspace_id: \`${ctx.workspaceId}\`\n` +
    `${teamLine}\n` +
    `- Teams in workspace:\n${roster}\n` +
    `\nUse the active team's \`team_id\` for \`story.create\`, \`story.update\`, and \`story.list\` unless the user names a different team. ` +
    `Never ask the user for a team ID — infer it from this context.`
  );
}

const TOOLS_REQUIRING_TEAM_ID = new Set(['story.create', 'story.update']);

/** Inject active team_id into tool args when the model omitted it. */
export function enrichToolInputWithWorkspaceContext(
  toolName: string,
  input: Record<string, unknown>,
  ctx: AgentWorkspaceContext | null | undefined,
): Record<string, unknown> {
  if (!ctx?.teamId || !TOOLS_REQUIRING_TEAM_ID.has(toolName)) {
    return input;
  }
  const existing = input.team_id;
  if (typeof existing === 'string' && existing.length > 0) {
    return input;
  }
  return { ...input, team_id: ctx.teamId };
}
