// Server-only. Loads workspace team context for agent chat (system prompt + tool arg injection).
import type { WorkflowState } from '@landi-flow/core/types';
import { fetchFlowApiUpstream } from '@/lib/api/upstream-fetch';
import { resolveDefaultWorkflowStateId } from '@/lib/workflow-state-defaults';

export interface AgentWorkspaceTeam {
  id: string;
  name: string;
  key: string;
  slug: string;
}

export interface AgentWorkspaceContext {
  workspaceId: string;
  teamId: string | null;
  teamName: string | null;
  teamKey: string | null;
  teamSlug: string | null;
  defaultWorkflowStateId: string | null;
  teams: AgentWorkspaceTeam[];
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
  slug: string;
}

function normalizeTeamLookup(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Resolve a team reference (UUID, slug, or key) to the canonical team UUID from the roster.
 * Returns the input unchanged when no roster match exists (e.g. mock/dev fixtures).
 */
export function resolveTeamIdFromRoster(
  teams: AgentWorkspaceTeam[],
  reference: string | null | undefined,
): string | null {
  if (!reference || reference.length === 0) {
    return null;
  }

  const normalized = normalizeTeamLookup(reference);
  const byId = teams.find((team) => team.id === reference);
  if (byId) {
    return byId.id;
  }

  const bySlugOrKey = teams.find(
    (team) =>
      normalizeTeamLookup(team.slug) === normalized ||
      normalizeTeamLookup(team.key) === normalized,
  );
  if (bySlugOrKey) {
    return bySlugOrKey.id;
  }

  return reference;
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
    slug: team.slug,
  }));

  const resolvedDefaultTeamId = resolveTeamIdFromRoster(teams, defaults.team_id);
  const activeTeam = resolvedDefaultTeamId
    ? teams.find((team) => team.id === resolvedDefaultTeamId) ?? null
    : teams[0] ?? null;

  const teamId = activeTeam?.id ?? resolvedDefaultTeamId;
  let defaultWorkflowStateId = defaults.default_workflow_state_id;

  if (teamId && !defaultWorkflowStateId) {
    const statesPayload = await fetchJson<{ data: WorkflowState[] }>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/workflow-states?team_id=${encodeURIComponent(teamId)}`,
      accessToken,
    );
    defaultWorkflowStateId = resolveDefaultWorkflowStateId(
      null,
      statesPayload?.data ?? [],
    );
  }

  return {
    workspaceId,
    teamId,
    teamName: activeTeam?.name ?? null,
    teamKey: activeTeam?.key ?? null,
    teamSlug: activeTeam?.slug ?? null,
    defaultWorkflowStateId,
    teams,
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

  const roster =
    ctx.teams.length > 0
      ? ctx.teams
          .map((t) => `  - ${t.name} · team_id=\`${t.id}\`${t.key ? ` (key: ${t.key})` : ''}`)
          .join('\n')
      : '  - (no teams loaded)';

  return (
    `\n\n## Active workspace\n` +
    `- workspace_id: \`${ctx.workspaceId}\`\n` +
    `${teamLine}\n` +
    `${workflowStateLine}\n` +
    `- Teams in workspace:\n${roster}\n` +
    `\nUse each team's UUID \`team_id\` (never slug or key) for \`story.create\`, \`story.update\`, and \`story.list\` unless the user names a different team. ` +
    `Use the default \`workflow_state_id\` for \`story.create\` unless the user names a different state. ` +
    `Never ask the user for a team ID or workflow state ID — infer them from this context.`
  );
}

const TOOLS_REQUIRING_TEAM_ID = new Set(['story.create', 'story.update']);
const TOOLS_REQUIRING_WORKFLOW_STATE_ID = new Set(['story.create']);

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** Inject active team_id and default workflow_state_id into tool args when the model omitted them. */
export function enrichToolInputWithWorkspaceContext(
  toolName: string,
  input: Record<string, unknown>,
  ctx: AgentWorkspaceContext | null | undefined,
): Record<string, unknown> {
  if (!ctx) {
    return input;
  }

  let enriched = input;

  if (TOOLS_REQUIRING_TEAM_ID.has(toolName)) {
    const rawTeamId = hasNonEmptyString(enriched.team_id)
      ? enriched.team_id
      : ctx.teamId;
    const resolvedTeamId = resolveTeamIdFromRoster(ctx.teams, rawTeamId);
    if (resolvedTeamId) {
      enriched = { ...enriched, team_id: resolvedTeamId };
    }
  }

  if (
    ctx.defaultWorkflowStateId &&
    TOOLS_REQUIRING_WORKFLOW_STATE_ID.has(toolName) &&
    !hasNonEmptyString(enriched.workflow_state_id)
  ) {
    enriched = { ...enriched, workflow_state_id: ctx.defaultWorkflowStateId };
  }

  return enriched;
}
