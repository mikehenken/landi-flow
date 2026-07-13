// Server-only. Loads workspace team context for agent chat (system prompt + tool arg injection).
import type { EpicStatusCategory, WorkflowState } from '@landi-flow/core/types';
import { fetchFlowApiUpstream } from '@/lib/api/upstream-fetch';
import { EPIC_STATUS_LABELS } from '@/lib/epic-status';
import { resolveEpicStatusId } from '@/lib/resolve-epic-status-id';
import { DEMO_TEAM_ID, DEMO_WORKFLOW_STATE_ROWS } from '@/lib/seed-data';
import { resolveDefaultWorkflowStateId } from '@/lib/workflow-state-defaults';

export interface AgentWorkspaceTeam {
  id: string;
  name: string;
  key: string;
  slug: string;
}

export interface AgentEpicStatus {
  id: string;
  name: string;
  category: EpicStatusCategory;
}

export interface AgentWorkspaceContext {
  workspaceId: string;
  teamId: string | null;
  teamName: string | null;
  teamKey: string | null;
  teamSlug: string | null;
  defaultWorkflowStateId: string | null;
  defaultEpicStatusId: string | null;
  completedWorkflowStateId: string | null;
  completedEpicStatusId: string | null;
  teams: AgentWorkspaceTeam[];
  workflowStates: WorkflowState[];
  epicStatuses: AgentEpicStatus[];
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

interface EpicStatusRow {
  id: string;
  name: string;
  category: EpicStatusCategory;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const COMPLETE_ALIASES = new Set([
  'complete',
  'completed',
  'done',
  'finished',
  'closed',
  'resolved',
]);

const TOOLS_WITH_TEAM_ID = new Set([
  'story.create',
  'story.update',
  'story.list',
  'story.decompose',
]);

const TOOLS_WITH_WORKFLOW_STATE_ID = new Set([
  'story.create',
  'story.update',
  'story.decompose',
]);

const TOOLS_WITH_EPIC_ID = new Set([
  'story.create',
  'story.update',
  'epic.get',
  'epic.update',
  'epic.assign',
  'epic.create',
  'comment.create',
  'comment.reply',
  'comment.create_as_proxy',
  'signal.attach',
]);

const TOOLS_WITH_STATUS_ID = new Set(['epic.create', 'epic.update']);

const TOOLS_WITH_STORY_ID = new Set([
  'story.update',
  'story.assign',
  'comment.create',
  'comment.reply',
  'comment.create_as_proxy',
  'signal.attach',
]);

const TOOLS_WITH_STORY_REF = new Set(['story.get']);

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase();
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
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

  const normalized = normalizeLookup(reference);
  const byId = teams.find((team) => team.id === reference);
  if (byId) {
    return byId.id;
  }

  const bySlugOrKey = teams.find(
    (team) =>
      normalizeLookup(team.slug) === normalized ||
      normalizeLookup(team.key) === normalized ||
      normalizeLookup(team.name) === normalized,
  );
  if (bySlugOrKey) {
    return bySlugOrKey.id;
  }

  return reference;
}

/** Resolve workflow state by UUID, name, or completion alias (done/complete/completed). */
export function resolveWorkflowStateId(
  states: WorkflowState[],
  reference: string | null | undefined,
  options?: { intent?: 'complete' | 'default' },
): string | null {
  if (!reference || reference.length === 0) {
    if (options?.intent === 'complete') {
      return states.find((state) => state.category === 'completed')?.id ?? null;
    }
    if (options?.intent === 'default') {
      return resolveDefaultWorkflowStateId(null, states);
    }
    return null;
  }

  const normalized = normalizeLookup(reference);
  const byId = states.find((state) => state.id === reference);
  if (byId) {
    return byId.id;
  }

  const byName = states.find((state) => normalizeLookup(state.name) === normalized);
  if (byName) {
    return byName.id;
  }

  if (COMPLETE_ALIASES.has(normalized)) {
    return states.find((state) => state.category === 'completed')?.id ?? null;
  }

  return reference;
}

export { resolveEpicStatusId } from '@/lib/resolve-epic-status-id';

function findCompletedWorkflowStateId(states: WorkflowState[]): string | null {
  return states.find((state) => state.category === 'completed')?.id ?? null;
}

function findCompletedEpicStatusId(statuses: AgentEpicStatus[]): string | null {
  return statuses.find((status) => status.category === 'completed')?.id ?? null;
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
  const teams: AgentWorkspaceTeam[] = [
    {
      id: DEMO_TEAM_ID,
      name: 'Design',
      key: 'DSN',
      slug: 'team-design',
    },
  ];
  const workflowStates = DEMO_WORKFLOW_STATE_ROWS;
  const epicStatuses: AgentEpicStatus[] = (
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
    completedWorkflowStateId: findCompletedWorkflowStateId(workflowStates),
    completedEpicStatusId: findCompletedEpicStatusId(epicStatuses),
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
  const epicStatuses: AgentEpicStatus[] = (epicStatusesPayload?.data ?? []).map((status) => ({
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
    completedWorkflowStateId: findCompletedWorkflowStateId(workflowStates),
    completedEpicStatusId: findCompletedEpicStatusId(epicStatuses),
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
    `\nPrefer UUIDs from this context for tool arguments. Slugs, keys, and names are resolved server-side before MCP calls. ` +
    `To mark a **Story** complete, set \`workflow_state_id\` to the completed workflow state above — not priority. ` +
    `To mark an **Epic** complete, use \`epic.update\` with \`status_id\` set to the completed Epic status above. ` +
    `When the user names an Epic or Story by title, first use \`epic.list\` / \`flow.search\` / \`story.get\` to resolve ids. ` +
    `Never ask the user for a team ID, workflow state ID, or epic status ID — infer them from this context.`
  );
}

function hasCompletionIntent(input: Record<string, unknown>): boolean {
  const statusAlias = hasNonEmptyString(input.status) ? input.status : null;
  const workflowAlias = hasNonEmptyString(input.workflow_state_id) ? input.workflow_state_id : null;
  const priorityAlias = hasNonEmptyString(input.priority) ? input.priority : null;

  return (
    (statusAlias !== null && COMPLETE_ALIASES.has(normalizeLookup(statusAlias))) ||
    (workflowAlias !== null && COMPLETE_ALIASES.has(normalizeLookup(workflowAlias))) ||
    (priorityAlias !== null && COMPLETE_ALIASES.has(normalizeLookup(priorityAlias)))
  );
}

function resolveWorkflowStateForInput(
  input: Record<string, unknown>,
  ctx: AgentWorkspaceContext,
): string | null {
  const explicit = hasNonEmptyString(input.workflow_state_id) ? input.workflow_state_id : null;
  const statusAlias = hasNonEmptyString(input.status) ? input.status : null;
  const intentComplete =
    explicit !== null && COMPLETE_ALIASES.has(normalizeLookup(explicit))
      ? 'complete'
      : statusAlias !== null && COMPLETE_ALIASES.has(normalizeLookup(statusAlias))
        ? 'complete'
        : undefined;

  return resolveWorkflowStateId(ctx.workflowStates, explicit ?? statusAlias, {
    intent: intentComplete,
  });
}

/** Inject and normalize workspace-scoped tool args before MCP calls. */
export function enrichToolInputWithWorkspaceContext(
  toolName: string,
  input: Record<string, unknown>,
  ctx: AgentWorkspaceContext | null | undefined,
): Record<string, unknown> {
  if (!ctx) {
    return input;
  }

  let enriched = { ...input };

  if (TOOLS_WITH_TEAM_ID.has(toolName)) {
    const rawTeamId = hasNonEmptyString(enriched.team_id) ? enriched.team_id : ctx.teamId;
    const resolvedTeamId = resolveTeamIdFromRoster(ctx.teams, rawTeamId);
    if (resolvedTeamId) {
      enriched = { ...enriched, team_id: resolvedTeamId };
    }
  }

  if (TOOLS_WITH_WORKFLOW_STATE_ID.has(toolName)) {
    const resolvedWorkflowStateId = resolveWorkflowStateForInput(enriched, ctx);
    if (resolvedWorkflowStateId) {
      enriched = { ...enriched, workflow_state_id: resolvedWorkflowStateId };
    } else if (
      ctx.defaultWorkflowStateId &&
      toolName === 'story.create' &&
      !hasNonEmptyString(enriched.workflow_state_id)
    ) {
      enriched = { ...enriched, workflow_state_id: ctx.defaultWorkflowStateId };
    }

    if (toolName === 'story.update' && hasCompletionIntent(enriched)) {
      const completedStateId =
        ctx.completedWorkflowStateId ??
        resolveWorkflowStateId(ctx.workflowStates, 'done', { intent: 'complete' });
      if (completedStateId) {
        enriched = { ...enriched, workflow_state_id: completedStateId };
        if (
          hasNonEmptyString(enriched.priority) &&
          !hasNonEmptyString(input.workflow_state_id) &&
          COMPLETE_ALIASES.has(normalizeLookup(enriched.priority))
        ) {
          const { priority: _removed, ...withoutPriority } = enriched;
          enriched = withoutPriority;
        }
      }
    }
  }

  if (TOOLS_WITH_STATUS_ID.has(toolName)) {
    const rawStatusId = hasNonEmptyString(enriched.status_id) ? enriched.status_id : null;
    const statusAlias = hasNonEmptyString(enriched.status) ? enriched.status : null;
    const resolvedStatusId = resolveEpicStatusId(ctx.epicStatuses, rawStatusId ?? statusAlias, {
      intent:
        (rawStatusId !== null && COMPLETE_ALIASES.has(normalizeLookup(rawStatusId))) ||
        (statusAlias !== null && COMPLETE_ALIASES.has(normalizeLookup(statusAlias)))
          ? 'complete'
          : undefined,
      defaultStatusId: ctx.defaultEpicStatusId,
    });
    if (resolvedStatusId) {
      enriched = { ...enriched, status_id: resolvedStatusId };
    } else if (
      ctx.defaultEpicStatusId &&
      toolName === 'epic.create' &&
      !hasNonEmptyString(enriched.status_id)
    ) {
      enriched = { ...enriched, status_id: ctx.defaultEpicStatusId };
    }
  }

  if (TOOLS_WITH_EPIC_ID.has(toolName) && hasNonEmptyString(enriched.epic_id)) {
    const epicRef = enriched.epic_id;
    if (!isUuid(epicRef)) {
      // Keep slug/name refs for async resolution in apply; do not coerce to UUID here.
      enriched = { ...enriched, epic_id: epicRef };
    }
  }

  if (TOOLS_WITH_STORY_ID.has(toolName) && hasNonEmptyString(enriched.story_id)) {
    const storyRef = enriched.story_id;
    if (!isUuid(storyRef)) {
      enriched = { ...enriched, story_id: storyRef };
    }
  }

  if (TOOLS_WITH_STORY_REF.has(toolName) && hasNonEmptyString(enriched.story)) {
    enriched = { ...enriched, story: enriched.story };
  }

  return enriched;
}

/** Validate enriched tool args before a live MCP write. Returns an error message or null. */
export function validateEnrichedToolInput(
  toolName: string,
  input: Record<string, unknown>,
): string | null {
  if (TOOLS_WITH_TEAM_ID.has(toolName)) {
    const teamId = input.team_id;
    if (typeof teamId !== 'string' || teamId.length === 0) {
      return `Missing team_id for ${toolName}. Load workspace context or specify a team.`;
    }
    if (!isUuid(teamId)) {
      return `team_id "${teamId}" is not a UUID. Use a team UUID from workspace context (slug "${teamId}" could not be resolved).`;
    }
  }

  if (TOOLS_WITH_WORKFLOW_STATE_ID.has(toolName) && hasNonEmptyString(input.workflow_state_id)) {
    if (!isUuid(input.workflow_state_id)) {
      return `workflow_state_id "${input.workflow_state_id}" is not a UUID and could not be resolved.`;
    }
  }

  if (TOOLS_WITH_STATUS_ID.has(toolName) && hasNonEmptyString(input.status_id)) {
    if (!isUuid(input.status_id)) {
      return `status_id "${input.status_id}" is not a UUID and could not be resolved.`;
    }
  }

  if (TOOLS_WITH_STORY_ID.has(toolName) && hasNonEmptyString(input.story_id)) {
    if (!isUuid(input.story_id)) {
      return `story_id "${input.story_id}" is not a UUID. Search for the Story first (flow.search / story.get) or retry after identifier resolution.`;
    }
  }

  if (TOOLS_WITH_EPIC_ID.has(toolName) && hasNonEmptyString(input.epic_id)) {
    if (!isUuid(input.epic_id)) {
      return `epic_id "${input.epic_id}" is not a UUID. List Epics first (epic.list) or retry after identifier resolution.`;
    }
  }

  return null;
}
