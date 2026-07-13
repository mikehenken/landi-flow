/**
 * Server-side MCP input enrichment — resolves slugs, names, and identifiers to UUIDs
 * before mutation handlers run. Shared resolver logic lives in @landi-flow/core/mcp.
 */
import {
  TOOLS_WITH_ASSIGNEE_ID,
  TOOLS_WITH_EPIC_ID,
  TOOLS_WITH_LEAD_ID,
  TOOLS_WITH_STORY_ID,
  TOOLS_WITH_STORY_REF,
  TOOLS_WITH_TEAM_ID,
  enrichToolInputWithWorkspaceContext,
  isUuid,
  normalizeLookup,
  normalizeToolName,
  resolveAssigneeId,
  resolveTeamIdFromRoster,
  toAgentWorkspaceContext,
  validateEnrichedToolInput,
  type McpWorkspaceContext,
} from '@landi-flow/core/mcp';
import type { McpProjectService } from '../mcp/mutations.js';
import { ToolInputError } from '../mcp/tool-types.js';
import { loadMcpWorkspaceContext } from './workspace-context-loader.js';
import type { DbClient } from './db.js';

export const MUTATION_TOOLS_WITH_ENRICHMENT = new Set([
  'story.create',
  'story.update',
  'story.assign',
  'story.decompose',
  'epic.create',
  'epic.update',
  'epic.assign',
  'comment.create',
  'comment.reply',
  'comment.create_as_proxy',
  'signal.attach',
]);

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

async function resolveStoryReference(
  service: McpProjectService,
  storyRef: string,
): Promise<StoryRow | null> {
  if (isUuid(storyRef)) {
    const story = (await service.getStory(storyRef)) as StoryRow | null;
    return story ?? { id: storyRef, team_id: '' };
  }

  const results = (await service.searchStories(storyRef, 10)) as StoryRow[];
  const normalized = normalizeLookup(storyRef);
  const exact = results.find(
    (story) =>
      story.identifier === storyRef ||
      normalizeLookup(story.identifier ?? '') === normalized ||
      normalizeLookup(story.title ?? '') === normalized,
  );
  return exact ?? results[0] ?? null;
}

async function resolveEpicReference(
  service: McpProjectService,
  epicRef: string,
): Promise<EpicRow | null> {
  if (isUuid(epicRef)) {
    const epic = (await service.getEpic(epicRef)) as EpicRow | null;
    return epic ?? { id: epicRef };
  }

  const epics = (await service.listEpics(100)) as EpicRow[];
  const normalized = normalizeLookup(epicRef);
  return (
    epics.find(
      (epic) =>
        epic.id === epicRef ||
        normalizeLookup(epic.slug ?? '') === normalized ||
        normalizeLookup(epic.name ?? '') === normalized ||
        normalizeLookup(epic.name ?? '').includes(normalized),
    ) ?? null
  );
}

async function resolveEntityReferences(
  service: McpProjectService,
  toolName: string,
  input: Record<string, unknown>,
  ctx: McpWorkspaceContext,
): Promise<Record<string, unknown>> {
  const canonical = normalizeToolName(toolName);
  let enriched = { ...input };

  if (TOOLS_WITH_TEAM_ID.has(canonical)) {
    const teamRef = typeof enriched.team_id === 'string' ? enriched.team_id : ctx.default_team_id;
    const resolvedTeamId = resolveTeamIdFromRoster(
      ctx.teams.map(({ id, name, key, slug }) => ({ id, name, key, slug })),
      teamRef,
    );
    if (resolvedTeamId && isUuid(resolvedTeamId)) {
      enriched = { ...enriched, team_id: resolvedTeamId };
    } else if (ctx.default_team_id && isUuid(ctx.default_team_id)) {
      enriched = { ...enriched, team_id: ctx.default_team_id };
    }
  }

  if (TOOLS_WITH_STORY_ID.has(canonical) && typeof enriched.story_id === 'string' && !isUuid(enriched.story_id)) {
    const story = await resolveStoryReference(service, enriched.story_id);
    if (story) {
      enriched = {
        ...enriched,
        story_id: story.id,
        team_id: enriched.team_id ?? story.team_id,
      };
    }
  }

  if (TOOLS_WITH_STORY_REF.has(canonical) && typeof enriched.story === 'string' && !isUuid(enriched.story)) {
    const story = await resolveStoryReference(service, enriched.story);
    if (story) {
      enriched = { ...enriched, story: story.id };
    }
  }

  if (TOOLS_WITH_EPIC_ID.has(canonical) && typeof enriched.epic_id === 'string' && !isUuid(enriched.epic_id)) {
    const epic = await resolveEpicReference(service, enriched.epic_id);
    if (epic) {
      enriched = { ...enriched, epic_id: epic.id };
    }
  }

  if (canonical === 'story.update' && !enriched.team_id && typeof enriched.story_id === 'string' && isUuid(enriched.story_id)) {
    const story = (await service.getStory(enriched.story_id)) as StoryRow | null;
    if (story?.team_id) {
      enriched = { ...enriched, team_id: story.team_id };
    }
  }

  if (TOOLS_WITH_ASSIGNEE_ID.has(canonical) && typeof enriched.assignee_id === 'string') {
    const resolved = resolveAssigneeId(ctx.members, enriched.assignee_id);
    if (resolved) {
      enriched = { ...enriched, assignee_id: resolved };
    }
  }

  if (TOOLS_WITH_LEAD_ID.has(canonical) && typeof enriched.lead_id === 'string') {
    const resolved = resolveAssigneeId(ctx.members, enriched.lead_id);
    if (resolved) {
      enriched = { ...enriched, lead_id: resolved };
    }
  }

  if (canonical === 'story.assign' && typeof enriched.delegate_agent_id === 'string') {
    const resolved = resolveAssigneeId(ctx.members, enriched.delegate_agent_id);
    if (resolved) {
      enriched = { ...enriched, delegate_agent_id: resolved };
    }
  }

  if (canonical === 'epic.assign' && typeof enriched.delegate_agent_id === 'string') {
    const resolved = resolveAssigneeId(ctx.members, enriched.delegate_agent_id);
    if (resolved) {
      enriched = { ...enriched, delegate_agent_id: resolved };
    }
  }

  return enriched;
}

export async function loadWorkspaceContextForMcp(
  db: DbClient,
  workspaceId: string,
  userId: string | null,
): Promise<McpWorkspaceContext> {
  return loadMcpWorkspaceContext(db, workspaceId, userId);
}

/** Full enrichment pipeline: sync context injection + async entity resolution + validation. */
export async function enrichMutationToolInput(params: {
  db: DbClient;
  service: McpProjectService;
  toolName: string;
  input: Record<string, unknown>;
  workspaceId: string;
  userId: string | null;
  workspaceContext?: McpWorkspaceContext;
}): Promise<Record<string, unknown>> {
  const { db, service, toolName, input, workspaceId, userId } = params;
  const canonical = normalizeToolName(toolName);

  if (!MUTATION_TOOLS_WITH_ENRICHMENT.has(canonical)) {
    return input;
  }

  const ctx = params.workspaceContext ?? (await loadMcpWorkspaceContext(db, workspaceId, userId));
  const agentCtx = toAgentWorkspaceContext(ctx);

  let enriched = enrichToolInputWithWorkspaceContext(toolName, input, agentCtx);
  enriched = await resolveEntityReferences(service, toolName, enriched, ctx);

  const validationError = validateEnrichedToolInput(toolName, enriched);
  if (validationError) {
    throw new ToolInputError(validationError);
  }

  return enriched;
}

export { McpWorkspaceContext };
