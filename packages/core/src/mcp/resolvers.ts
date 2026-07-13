import type { AssignableMember, WorkflowState } from '../types/index.js';
import type { McpEpicStatusRef, McpWorkspaceTeam } from './types.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const COMPLETE_ALIASES = new Set([
  'complete',
  'completed',
  'done',
  'finished',
  'closed',
  'resolved',
]);

export const BACKLOG_ALIASES = new Set(['backlog', 'todo', 'triage', 'unstarted']);

export function normalizeLookup(value: string): string {
  return value.trim().toLowerCase();
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function hasNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** Resolve a team reference (UUID, slug, key, or name) to the canonical team UUID. */
export function resolveTeamIdFromRoster(
  teams: McpWorkspaceTeam[],
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

/** Resolve workflow state by UUID, name, or completion/backlog alias. */
export function resolveWorkflowStateId(
  states: WorkflowState[],
  reference: string | null | undefined,
  options?: { intent?: 'complete' | 'default' | 'backlog' },
): string | null {
  if (!reference || reference.length === 0) {
    if (options?.intent === 'complete') {
      return states.find((state) => state.category === 'completed')?.id ?? null;
    }
    if (options?.intent === 'backlog') {
      return (
        states.find((state) => state.category === 'backlog')?.id ??
        states.find((state) => state.category === 'unstarted')?.id ??
        states.find((state) => state.is_default)?.id ??
        null
      );
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

  if (BACKLOG_ALIASES.has(normalized)) {
    return (
      states.find((state) => state.category === 'backlog')?.id ??
      states.find((state) => state.category === 'unstarted')?.id ??
      null
    );
  }

  return reference;
}

/** Pick the default workflow state when workspace defaults omit an id. */
export function resolveDefaultWorkflowStateId(
  defaultFromApi: string | null,
  states: WorkflowState[],
): string | null {
  if (defaultFromApi) {
    return defaultFromApi;
  }
  if (states.length === 0) {
    return null;
  }
  const flaggedDefault = states.find((state) => state.is_default);
  if (flaggedDefault) {
    return flaggedDefault.id;
  }
  const unstarted = states.find((state) => state.category === 'unstarted');
  if (unstarted) {
    return unstarted.id;
  }
  const sorted = [...states].sort((a, b) => a.position - b.position);
  return sorted[0]?.id ?? null;
}

/** Resolve epic status by UUID, slug/category alias, name, or completion alias. */
export function resolveEpicStatusId(
  statuses: McpEpicStatusRef[],
  reference: string | null | undefined,
  options?: { intent?: 'complete' | 'default'; defaultStatusId?: string | null },
): string | null {
  if (!reference || reference.length === 0) {
    if (options?.intent === 'complete') {
      return statuses.find((status) => status.category === 'completed')?.id ?? null;
    }
    if (options?.intent === 'default') {
      return (
        options.defaultStatusId ??
        statuses.find((status) => status.category === 'backlog')?.id ??
        statuses[0]?.id ??
        null
      );
    }
    return null;
  }

  const normalized = normalizeLookup(reference);
  const byId = statuses.find((status) => status.id === reference);
  if (byId) {
    return byId.id;
  }

  const bySlug = statuses.find(
    (status) => hasNonEmptyString(status.slug) && normalizeLookup(status.slug) === normalized,
  );
  if (bySlug) {
    return bySlug.id;
  }

  const legacyMockMatch = reference.match(/^epic-status-([a-z-]+)$/i);
  if (legacyMockMatch) {
    const category = legacyMockMatch[1].replace(/-/g, '_') as McpEpicStatusRef['category'];
    const byLegacyCategory = statuses.find((status) => status.category === category);
    if (byLegacyCategory) {
      return byLegacyCategory.id;
    }
  }

  const byName = statuses.find((status) => normalizeLookup(status.name) === normalized);
  if (byName) {
    return byName.id;
  }

  const byCategory = statuses.find((status) => normalizeLookup(status.category) === normalized);
  if (byCategory) {
    return byCategory.id;
  }

  if (COMPLETE_ALIASES.has(normalized)) {
    return statuses.find((status) => status.category === 'completed')?.id ?? null;
  }

  if (BACKLOG_ALIASES.has(normalized)) {
    return statuses.find((status) => status.category === 'backlog')?.id ?? null;
  }

  return reference;
}

/** Resolve assignee/lead by member UUID, display name, or email-like substring. */
export function resolveAssigneeId(
  members: AssignableMember[],
  reference: string | null | undefined,
): string | null {
  if (!reference || reference.length === 0) {
    return null;
  }

  const normalized = normalizeLookup(reference);
  const byId = members.find((member) => member.id === reference);
  if (byId) {
    return byId.id;
  }

  const byExactName = members.find((member) => normalizeLookup(member.name) === normalized);
  if (byExactName) {
    return byExactName.id;
  }

  const byPartialName = members.find((member) =>
    normalizeLookup(member.name).includes(normalized),
  );
  if (byPartialName) {
    return byPartialName.id;
  }

  return reference;
}

/** Derive a URL-safe epic slug from a display name. */
export function slugifyEpicName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug.length > 0 ? slug : 'epic';
}
