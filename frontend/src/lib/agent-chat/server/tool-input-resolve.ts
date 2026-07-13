// Server-only. Resolves human-friendly Story/Epic references to UUIDs via the API
// before live MCP writes (identifiers like LAN-2, slugs, titles).
import type { WorkflowState } from '@landi-flow/core/types';
import {
  hasNonEmptyString,
  isUuid,
  normalizeToolName,
  resolveDefaultWorkflowStateId,
  resolveTeamIdFromRoster,
  type McpWorkspaceTeam,
} from '@landi-flow/core/mcp';
import { fetchFlowApiUpstream } from '@/lib/api/upstream-fetch';
import {
  enrichToolInputWithWorkspaceContext,
  type AgentWorkspaceContext,
} from './workspace-context';

interface StoryRow {
  id: string;
  team_id: string;
  identifier?: string;
  title?: string;
}

interface EpicRow {
  id: string;
  name?: string;
  slug?: string;
}

interface TeamRow {
  id: string;
  name: string;
  key: string;
  slug: string;
}

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase();
}

function mapTeamRows(rows: TeamRow[]): McpWorkspaceTeam[] {
  return rows.map((team) => ({
    id: team.id,
    name: team.name,
    key: team.key,
    slug: team.slug,
  }));
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

async function fetchWorkspaceTeams(
  workspaceId: string,
  accessToken: string,
): Promise<McpWorkspaceTeam[]> {
  const teamsPayload = await fetchJson<{ data: TeamRow[] }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/teams`,
    accessToken,
  );
  return mapTeamRows(teamsPayload?.data ?? []);
}

async function fetchWorkflowStatesForTeam(
  workspaceId: string,
  teamId: string,
  accessToken: string,
): Promise<WorkflowState[]> {
  const statesPayload = await fetchJson<{ data: WorkflowState[] }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/workflow-states?team_id=${encodeURIComponent(teamId)}`,
    accessToken,
  );
  return statesPayload?.data ?? [];
}

async function resolveTeamIdForApply(params: {
  teamRef: string | null | undefined;
  workspaceContext: AgentWorkspaceContext | null | undefined;
  workspaceId: string;
  accessToken: string;
}): Promise<string | null> {
  const { teamRef, workspaceContext, workspaceId, accessToken } = params;
  let teams = workspaceContext?.teams ?? [];
  if (teams.length === 0) {
    teams = await fetchWorkspaceTeams(workspaceId, accessToken);
  }

  const candidate =
    teamRef ??
    workspaceContext?.teamId ??
    (teams.length > 0 ? teams[0]?.id : null);
  const resolved = resolveTeamIdFromRoster(teams, candidate);
  return resolved && isUuid(resolved) ? resolved : null;
}

async function resolveStoryReference(
  workspaceId: string,
  storyRef: string,
  accessToken: string,
  teamIdHint?: string | null,
): Promise<StoryRow | null> {
  if (isUuid(storyRef)) {
    return { id: storyRef, team_id: teamIdHint ?? '' };
  }

  const teamsPayload = await fetchJson<{ data: Array<{ id: string }> }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/teams`,
    accessToken,
  );
  const teamIds = (teamsPayload?.data ?? []).map((team) => team.id);
  if (teamIdHint && isUuid(teamIdHint) && !teamIds.includes(teamIdHint)) {
    teamIds.unshift(teamIdHint);
  }

  for (const teamId of teamIds) {
    const storiesPayload = await fetchJson<{ data: StoryRow[] }>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/teams/${encodeURIComponent(teamId)}/stories`,
      accessToken,
    );
    const stories = storiesPayload?.data ?? [];
    const match = stories.find(
      (story) =>
        story.identifier === storyRef ||
        normalizeLookup(story.identifier ?? '') === normalizeLookup(storyRef) ||
        normalizeLookup(story.title ?? '') === normalizeLookup(storyRef),
    );
    if (match) {
      return match;
    }
  }

  return null;
}

async function resolveEpicReference(
  workspaceId: string,
  epicRef: string,
  accessToken: string,
): Promise<EpicRow | null> {
  if (isUuid(epicRef)) {
    return { id: epicRef };
  }

  const epicsPayload = await fetchJson<{ data: EpicRow[] }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/epics`,
    accessToken,
  );
  const epics = epicsPayload?.data ?? [];
  const normalized = normalizeLookup(epicRef);
  const match = epics.find(
    (epic) =>
      epic.id === epicRef ||
      normalizeLookup(epic.slug ?? '') === normalized ||
      normalizeLookup(epic.name ?? '') === normalized ||
      normalizeLookup(epic.name ?? '').includes(normalized) ||
      normalized.includes(normalizeLookup(epic.name ?? '')),
  );
  return match ?? null;
}

/**
 * Enrich tool args with workspace context, then resolve Story/Epic identifiers via API.
 */
export async function resolveToolInputForApply(params: {
  toolName: string;
  input: Record<string, unknown>;
  workspaceContext: AgentWorkspaceContext | null | undefined;
  workspaceId?: string;
  accessToken?: string | null;
}): Promise<Record<string, unknown>> {
  const { toolName, input, workspaceContext, workspaceId, accessToken } = params;
  let enriched = enrichToolInputWithWorkspaceContext(toolName, input, workspaceContext);

  if (!workspaceId || !accessToken) {
    return enriched;
  }

  const canonical = normalizeToolName(toolName);

  if (
    (canonical === 'story.create' ||
      canonical === 'story.update' ||
      canonical === 'story.list' ||
      canonical === 'story.decompose') &&
    (typeof enriched.team_id !== 'string' || !isUuid(enriched.team_id))
  ) {
    const resolvedTeamId = await resolveTeamIdForApply({
      teamRef: typeof enriched.team_id === 'string' ? enriched.team_id : null,
      workspaceContext,
      workspaceId,
      accessToken,
    });
    if (resolvedTeamId) {
      enriched = { ...enriched, team_id: resolvedTeamId };
    }
  }

  if (
    canonical === 'story.create' &&
    typeof enriched.team_id === 'string' &&
    isUuid(enriched.team_id) &&
    !hasNonEmptyString(enriched.workflow_state_id)
  ) {
    const workflowStates = await fetchWorkflowStatesForTeam(
      workspaceId,
      enriched.team_id,
      accessToken,
    );
    const defaultWorkflowStateId = resolveDefaultWorkflowStateId(
      workspaceContext?.defaultWorkflowStateId ?? null,
      workflowStates,
    );
    if (defaultWorkflowStateId) {
      enriched = { ...enriched, workflow_state_id: defaultWorkflowStateId };
    }
  }

  if (typeof enriched.story_id === 'string' && !isUuid(enriched.story_id)) {
    const story = await resolveStoryReference(
      workspaceId,
      enriched.story_id,
      accessToken,
      typeof enriched.team_id === 'string' ? enriched.team_id : workspaceContext?.teamId,
    );
    if (story) {
      const teamRef =
        story.team_id ||
        (typeof enriched.team_id === 'string' ? enriched.team_id : null);
      const resolvedTeamId = await resolveTeamIdForApply({
        teamRef,
        workspaceContext,
        workspaceId,
        accessToken,
      });
      enriched = {
        ...enriched,
        story_id: story.id,
        team_id: resolvedTeamId ?? story.team_id,
      };
    }
  }

  if (typeof enriched.story === 'string' && !isUuid(enriched.story)) {
    const story = await resolveStoryReference(
      workspaceId,
      enriched.story,
      accessToken,
      workspaceContext?.teamId,
    );
    if (story) {
      enriched = { ...enriched, story: story.id };
    }
  }

  if (typeof enriched.epic_id === 'string' && !isUuid(enriched.epic_id)) {
    const epic = await resolveEpicReference(workspaceId, enriched.epic_id, accessToken);
    if (epic) {
      enriched = { ...enriched, epic_id: epic.id };
    }
  }

  return enriched;
}
