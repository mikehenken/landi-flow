import type { AgentWorkspaceContext } from './types.js';
import {
  COMPLETE_ALIASES,
  hasNonEmptyString,
  isUuid,
  normalizeLookup,
  resolveEpicStatusId,
  resolveTeamIdFromRoster,
  resolveWorkflowStateId,
  slugifyEpicName,
} from './resolvers.js';

export const TOOLS_WITH_TEAM_ID = new Set([
  'story.create',
  'story.update',
  'story.list',
  'story.decompose',
]);

export const TOOLS_WITH_WORKFLOW_STATE_ID = new Set([
  'story.create',
  'story.update',
  'story.decompose',
]);

export const TOOLS_WITH_EPIC_ID = new Set([
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

export const TOOLS_WITH_STATUS_ID = new Set(['epic.create', 'epic.update']);

export const TOOLS_WITH_STORY_ID = new Set([
  'story.update',
  'story.assign',
  'comment.create',
  'comment.reply',
  'comment.create_as_proxy',
  'signal.attach',
]);

export const TOOLS_WITH_STORY_REF = new Set(['story.get']);

export const TOOLS_WITH_ASSIGNEE_ID = new Set(['story.create', 'story.assign']);

export const TOOLS_WITH_LEAD_ID = new Set(['epic.create', 'epic.update', 'epic.assign']);

/** Normalize Cursor underscore aliases to canonical dot names. */
export function normalizeToolName(toolName: string): string {
  return toolName.replace(/_/g, '.');
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

/**
 * Inject and normalize workspace-scoped tool args before MCP calls.
 * Pure/synchronous — identifier→UUID resolution for stories/epics happens in the async layer.
 */
export function enrichToolInputWithWorkspaceContext(
  toolName: string,
  input: Record<string, unknown>,
  ctx: AgentWorkspaceContext | null | undefined,
): Record<string, unknown> {
  if (!ctx) {
    return input;
  }

  const canonical = normalizeToolName(toolName);
  let enriched = { ...input };

  if (TOOLS_WITH_TEAM_ID.has(canonical)) {
    const rawTeamId = hasNonEmptyString(enriched.team_id) ? enriched.team_id : ctx.teamId;
    const resolvedTeamId = resolveTeamIdFromRoster(ctx.teams, rawTeamId);
    if (resolvedTeamId && isUuid(resolvedTeamId)) {
      enriched = { ...enriched, team_id: resolvedTeamId };
    } else if (
      !hasNonEmptyString(enriched.team_id) &&
      ctx.teamId &&
      isUuid(ctx.teamId)
    ) {
      enriched = { ...enriched, team_id: ctx.teamId };
    }
  }

  if (TOOLS_WITH_WORKFLOW_STATE_ID.has(canonical)) {
    const resolvedWorkflowStateId = resolveWorkflowStateForInput(enriched, ctx);
    if (resolvedWorkflowStateId) {
      enriched = { ...enriched, workflow_state_id: resolvedWorkflowStateId };
    } else if (
      ctx.defaultWorkflowStateId &&
      canonical === 'story.create' &&
      !hasNonEmptyString(enriched.workflow_state_id)
    ) {
      enriched = { ...enriched, workflow_state_id: ctx.defaultWorkflowStateId };
    }

    if (canonical === 'story.update' && hasCompletionIntent(enriched)) {
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

  if (TOOLS_WITH_STATUS_ID.has(canonical)) {
    const statusesWithSlug = ctx.epicStatuses.map((status) => ({
      id: status.id,
      name: status.name,
      category: status.category,
      slug: status.category.replace(/_/g, '-'),
    }));
    const rawStatusId = hasNonEmptyString(enriched.status_id) ? enriched.status_id : null;
    const statusAlias = hasNonEmptyString(enriched.status) ? enriched.status : null;
    const resolvedStatusId = resolveEpicStatusId(statusesWithSlug, rawStatusId ?? statusAlias, {
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
      canonical === 'epic.create' &&
      !hasNonEmptyString(enriched.status_id)
    ) {
      enriched = { ...enriched, status_id: ctx.defaultEpicStatusId };
    }
  }

  if (canonical === 'epic.create') {
    if (!hasNonEmptyString(enriched.slug) && hasNonEmptyString(enriched.name)) {
      enriched = { ...enriched, slug: slugifyEpicName(enriched.name) };
    }
  }

  if (TOOLS_WITH_EPIC_ID.has(canonical) && hasNonEmptyString(enriched.epic_id)) {
    enriched = { ...enriched, epic_id: enriched.epic_id };
  }

  if (TOOLS_WITH_STORY_ID.has(canonical)) {
    if (hasNonEmptyString(enriched.story) && !hasNonEmptyString(enriched.story_id)) {
      enriched = { ...enriched, story_id: enriched.story };
    }
    if (hasNonEmptyString(enriched.story_id)) {
      enriched = { ...enriched, story_id: enriched.story_id };
    }
  }

  if (TOOLS_WITH_STORY_REF.has(canonical) && hasNonEmptyString(enriched.story)) {
    enriched = { ...enriched, story: enriched.story };
  }

  return enriched;
}

/** Validate enriched tool args before a live MCP write. Returns an error message or null. */
export function validateEnrichedToolInput(
  toolName: string,
  input: Record<string, unknown>,
): string | null {
  const canonical = normalizeToolName(toolName);

  if (TOOLS_WITH_TEAM_ID.has(canonical)) {
    const teamId = input.team_id;
    if (typeof teamId !== 'string' || teamId.length === 0) {
      return `Missing team_id for ${canonical}. Call workspace.context or specify a team slug/key.`;
    }
    if (!/^[0-9a-f-]{36}$/i.test(teamId)) {
      return `team_id "${teamId}" is not a UUID. Use workspace.context or a team slug/key.`;
    }
  }

  if (TOOLS_WITH_WORKFLOW_STATE_ID.has(canonical)) {
    if (canonical === 'story.create' || canonical === 'story.decompose') {
      const workflowStateId = input.workflow_state_id;
      if (typeof workflowStateId !== 'string' || workflowStateId.length === 0) {
        return `Missing workflow_state_id for ${canonical}. Call workspace.context or use "backlog"/"done".`;
      }
      if (!/^[0-9a-f-]{36}$/i.test(workflowStateId)) {
        return `workflow_state_id "${workflowStateId}" is not a UUID and could not be resolved.`;
      }
    } else if (hasNonEmptyString(input.workflow_state_id) && !/^[0-9a-f-]{36}$/i.test(input.workflow_state_id)) {
      return `workflow_state_id "${input.workflow_state_id}" is not a UUID and could not be resolved.`;
    }
  }

  if (TOOLS_WITH_STATUS_ID.has(canonical)) {
    if (canonical === 'epic.create') {
      const statusId = input.status_id;
      if (typeof statusId !== 'string' || statusId.length === 0) {
        return `Missing status_id for epic.create. Call workspace.context or use "backlog".`;
      }
      if (!/^[0-9a-f-]{36}$/i.test(statusId)) {
        return `status_id "${statusId}" is not a UUID and could not be resolved.`;
      }
    } else if (hasNonEmptyString(input.status_id) && !/^[0-9a-f-]{36}$/i.test(input.status_id)) {
      return `status_id "${input.status_id}" is not a UUID and could not be resolved.`;
    }
  }

  if (TOOLS_WITH_STORY_ID.has(canonical) && hasNonEmptyString(input.story_id)) {
    if (!/^[0-9a-f-]{36}$/i.test(input.story_id)) {
      return `story_id "${input.story_id}" is not a UUID. Use an identifier like LAN-2 or call flow.search first.`;
    }
  }

  if (TOOLS_WITH_EPIC_ID.has(canonical) && hasNonEmptyString(input.epic_id)) {
    if (!/^[0-9a-f-]{36}$/i.test(input.epic_id)) {
      return `epic_id "${input.epic_id}" is not a UUID. Call epic.list or use a slug/name.`;
    }
  }

  if (canonical === 'epic.create') {
    if (!hasNonEmptyString(input.name)) {
      return 'Missing required field: name';
    }
    if (!hasNonEmptyString(input.slug)) {
      return 'Missing required field: slug (auto-generated from name when possible)';
    }
  }

  if (canonical === 'story.create' && !hasNonEmptyString(input.title)) {
    return 'Missing required field: title';
  }

  if (canonical === 'story.update' && !hasNonEmptyString(input.story_id)) {
    return 'Missing story_id or story identifier (e.g. LAN-2).';
  }

  return null;
}

/** Convert full MCP workspace context to the slimmer agent-chat shape. */
export function toAgentWorkspaceContext(ctx: import('./types.js').McpWorkspaceContext): AgentWorkspaceContext {
  const defaultTeam =
    ctx.teams.find((team) => team.id === ctx.default_team_id) ?? ctx.teams[0] ?? null;

  return {
    workspaceId: ctx.workspace_id,
    teamId: ctx.default_team_id,
    teamName: defaultTeam?.name ?? null,
    teamKey: defaultTeam?.key ?? null,
    teamSlug: defaultTeam?.slug ?? null,
    defaultWorkflowStateId: defaultTeam?.default_workflow_state_id ?? null,
    defaultEpicStatusId: ctx.default_epic_status_id,
    completedWorkflowStateId: defaultTeam?.completed_workflow_state_id ?? null,
    completedEpicStatusId: ctx.completed_epic_status_id,
    teams: ctx.teams.map(({ id, name, key, slug }) => ({ id, name, key, slug })),
    workflowStates: (defaultTeam?.workflow_states ?? []).map((state) => ({
      id: state.id,
      team_id: state.team_id,
      name: state.name,
      category: state.category,
      position: 0,
      is_default: state.id === defaultTeam?.default_workflow_state_id,
    })),
    epicStatuses: ctx.epic_statuses.map(({ id, name, category }) => ({ id, name, category })),
  };
}
