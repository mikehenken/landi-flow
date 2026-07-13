/**
 * MCP tool catalogue (MCP-IDE-001/002/003). HITM nomenclature is enforced in every
 * schema: the platform noun is **Epic** (never Project) and **Story** (Issue only as
 * an API alias elsewhere). Tools are powerful enough for an IDE agent (Cursor, Claude
 * Code, Antigravity, OpenCode) to run the Story/Epic lifecycle end to end.
 *
 * Every tool declares required scopes and whether it writes; the dispatcher enforces
 * scope + read-only gates BEFORE invoking the handler (tool-layer enforcement, not
 * merely transport), and all writes flow through the Action Bus.
 */
import { MCP_SCOPES } from '../auth/scopes.js';
import type { McpProjectService } from './mutations.js';
import { AiGatewayNotConfiguredError, type AiGatewayClient } from '../ai/gateway.js';
import { COLLABORATION_TOOLS } from '../collaboration/tools.js';
import {
  ToolInputError,
  type ToolContext,
  type ToolDefinition,
} from './tool-types.js';

export { ToolInputError, type ToolContext, type ToolDefinition } from './tool-types.js';

function str(args: Record<string, unknown>, key: string): string | undefined {
  const v = args[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function requireStr(args: Record<string, unknown>, key: string): string {
  const v = str(args, key);
  if (!v) {
    throw new ToolInputError(`Missing required string argument: ${key}`);
  }
  return v;
}

const STRING = { type: 'string' } as const;
const OPTIONAL_ID = {
  ...STRING,
  description: 'Optional — resolved from workspace.context, slug, key, or name',
} as const;

export const MCP_TOOLS: ToolDefinition[] = [
  ...COLLABORATION_TOOLS,
  // ----------------------------------------------------------- workspace context
  {
    name: 'workspace.context',
    title: 'Workspace Context',
    description:
      'Returns everything needed for Story/Epic mutations in one call: teams, workflow states, epic statuses, labels, members, and defaults. Call this first instead of hunting UUIDs.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: {
          ...STRING,
          description: 'Optional when credential is workspace-bound',
        },
      },
    },
    requiredScopes: [MCP_SCOPES.READ],
    isWrite: false,
    handler: async ({ service, principal, workspaceId }) => {
      await service.assertWorkspaceAccess();
      return service.getWorkspaceContext(principal.userId);
    },
  },
  // ------------------------------------------------------------------ search
  {
    name: 'flow.search',
    title: 'Search Stories',
    description: 'Full-text search Stories in the workspace by title or identifier.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: { ...STRING, description: 'Workspace UUID (optional if credential is workspace-bound)' },
        query: { ...STRING, description: 'Search text matched against Story title and identifier' },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
      },
      required: ['query'],
    },
    requiredScopes: [MCP_SCOPES.READ],
    isWrite: false,
    handler: async ({ service }, args) => {
      const results = await service.searchStories(requireStr(args, 'query'), toLimit(args.limit, 25));
      return { results, count: results.length };
    },
  },

  // ------------------------------------------------------------------- epics
  {
    name: 'epic.list',
    title: 'List Epics',
    description: 'List active Epics in the workspace (Epic, never Project).',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: STRING,
        limit: { type: 'integer', minimum: 1, maximum: 100 },
      },
    },
    requiredScopes: [MCP_SCOPES.READ],
    isWrite: false,
    handler: async ({ service }, args) => {
      const epics = await service.listEpics(toLimit(args.limit, 50));
      return { epics, count: epics.length };
    },
  },
  {
    name: 'epic.get',
    title: 'Get Epic',
    description: 'Fetch a single Epic by id.',
    inputSchema: {
      type: 'object',
      properties: { workspace_id: STRING, epic_id: STRING },
      required: ['epic_id'],
    },
    requiredScopes: [MCP_SCOPES.READ],
    isWrite: false,
    handler: async ({ service }, args) => ({ epic: await service.getEpic(requireStr(args, 'epic_id')) }),
  },
  {
    name: 'epic.create',
    title: 'Create Epic',
    description: 'Create an Epic (the top-level planning container — Epic, never Project).',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: STRING,
        name: { ...STRING, description: 'Epic title / name' },
        slug: { ...OPTIONAL_ID, description: 'Optional — auto-generated from name when omitted' },
        status_id: { ...OPTIONAL_ID, description: 'Optional — defaults to backlog; accepts slug/name/“backlog”/“done”' },
        status: { ...OPTIONAL_ID, description: 'Alias for status_id (e.g. backlog, done, complete)' },
        description_md: STRING,
        priority: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'] },
        lead_id: { ...OPTIONAL_ID, description: 'Human lead — UUID or member name/email' },
        start_date: STRING,
        target_date: STRING,
        team_ids: { type: 'array', items: STRING },
      },
      required: ['name'],
    },
    requiredScopes: [MCP_SCOPES.EPICS_CREATE],
    isWrite: true,
    handler: async ({ service }, args) =>
      service.createEpic({
        name: requireStr(args, 'name'),
        slug: requireStr(args, 'slug'),
        status_id: requireStr(args, 'status_id'),
        description_md: str(args, 'description_md') ?? null,
        priority: str(args, 'priority'),
        lead_id: str(args, 'lead_id') ?? null,
        start_date: str(args, 'start_date') ?? null,
        target_date: str(args, 'target_date') ?? null,
        team_ids: toStringArray(args.team_ids),
      }),
  },
  {
    name: 'epic.update',
    title: 'Update Epic',
    description: 'Update fields on an existing Epic.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: STRING,
        epic_id: { ...OPTIONAL_ID, description: 'Epic UUID or slug/name' },
        name: STRING,
        description_md: STRING,
        status_id: { ...OPTIONAL_ID, description: 'Epic status UUID or slug/name (e.g. done, backlog)' },
        status: { ...OPTIONAL_ID, description: 'Alias for status_id' },
        priority: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'] },
        lead_id: { ...OPTIONAL_ID, description: 'Human lead — UUID or member name' },
        start_date: STRING,
        target_date: STRING,
      },
      required: ['epic_id'],
    },
    requiredScopes: [MCP_SCOPES.EPICS_WRITE],
    isWrite: true,
    handler: async ({ service }, args) => {
      const patch = pickDefined(args, [
        'name',
        'description_md',
        'status_id',
        'priority',
        'lead_id',
        'start_date',
        'target_date',
      ]);
      return service.updateEpic(requireStr(args, 'epic_id'), patch);
    },
  },

  // ----------------------------------------------------------------- stories
  {
    name: 'story.list',
    title: 'List Stories',
    description: 'List active Stories, optionally filtered by team.',
    inputSchema: {
      type: 'object',
      properties: { workspace_id: STRING, team_id: OPTIONAL_ID, limit: { type: 'integer', minimum: 1, maximum: 100 } },
    },
    requiredScopes: [MCP_SCOPES.READ],
    isWrite: false,
    handler: async ({ service }, args) => {
      const stories = await service.listStories(str(args, 'team_id'), toLimit(args.limit, 50));
      return { stories, count: stories.length };
    },
  },
  {
    name: 'story.get',
    title: 'Get Story',
    description: 'Fetch a Story by UUID or human identifier (e.g. ENG-123).',
    inputSchema: {
      type: 'object',
      properties: { workspace_id: STRING, story: { ...STRING, description: 'Story UUID or identifier' } },
      required: ['story'],
    },
    requiredScopes: [MCP_SCOPES.READ],
    isWrite: false,
    handler: async ({ service }, args) => ({ story: await service.getStory(requireStr(args, 'story')) }),
  },
  {
    name: 'story.create',
    title: 'Create Story',
    description: 'Create a Story on a team. Optionally attach to an Epic and/or delegate to an agent.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: STRING,
        team_id: { ...OPTIONAL_ID, description: 'Optional — defaults to workspace default team; accepts slug/key/name' },
        title: STRING,
        workflow_state_id: {
          ...OPTIONAL_ID,
          description: 'Optional — defaults to backlog; accepts name or aliases done/complete/backlog',
        },
        status: { ...OPTIONAL_ID, description: 'Alias for workflow_state_id (e.g. backlog, done)' },
        description_md: STRING,
        priority: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'] },
        assignee_id: { ...OPTIONAL_ID, description: 'Human assignee — UUID or member name' },
        delegate_agent_id: { ...OPTIONAL_ID, description: 'Agent delegate — UUID or agent name' },
        epic_id: { ...OPTIONAL_ID, description: 'Epic UUID or slug/name' },
        milestone_id: STRING,
        cycle_id: STRING,
        estimate: { type: 'number' },
      },
      required: ['title'],
    },
    requiredScopes: [MCP_SCOPES.STORIES_CREATE],
    isWrite: true,
    handler: async ({ service }, args) =>
      service.createStory({
        team_id: requireStr(args, 'team_id'),
        title: requireStr(args, 'title'),
        workflow_state_id: requireStr(args, 'workflow_state_id'),
        description_md: str(args, 'description_md') ?? null,
        priority: str(args, 'priority'),
        assignee_id: str(args, 'assignee_id') ?? null,
        delegate_agent_id: str(args, 'delegate_agent_id') ?? null,
        epic_id: str(args, 'epic_id') ?? null,
        milestone_id: str(args, 'milestone_id') ?? null,
        cycle_id: str(args, 'cycle_id') ?? null,
        estimate: typeof args.estimate === 'number' ? args.estimate : null,
      }),
  },
  {
    name: 'story.update',
    title: 'Update Story',
    description: 'Update a Story (title, description, workflow state, priority, epic, dates, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: STRING,
        team_id: { ...OPTIONAL_ID, description: 'Optional — inferred from story when omitted' },
        story_id: { ...OPTIONAL_ID, description: 'Story UUID or identifier (e.g. LAN-2)' },
        story: { ...OPTIONAL_ID, description: 'Alias for story_id' },
        title: STRING,
        description_md: STRING,
        workflow_state_id: {
          ...OPTIONAL_ID,
          description: 'Workflow state UUID or name; use done/complete to mark finished',
        },
        status: { ...OPTIONAL_ID, description: 'Alias for workflow_state_id (e.g. done, complete)' },
        priority: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'] },
        epic_id: { ...OPTIONAL_ID, description: 'Epic UUID or slug/name' },
        milestone_id: STRING,
        cycle_id: STRING,
        estimate: { type: 'number' },
      },
      required: [],
    },
    requiredScopes: [MCP_SCOPES.STORIES_WRITE],
    isWrite: true,
    handler: async ({ service }, args) => {
      const storyId = str(args, 'story_id') ?? str(args, 'story');
      if (!storyId) {
        throw new ToolInputError('Missing story_id or story identifier');
      }
      const patch = pickDefined(args, [
        'title',
        'description_md',
        'workflow_state_id',
        'priority',
        'epic_id',
        'milestone_id',
        'cycle_id',
        'estimate',
      ]);
      return service.updateStory(
        requireStr(args, 'team_id'),
        storyId,
        patch,
        patch.workflow_state_id !== undefined
      );
    },
  },
  {
    name: 'story.assign',
    title: 'Assign Story',
    description:
      'Assign a Story to a member. A human becomes the assignee (owner); an AGENT becomes the delegate (a first-class assignee that acts while the human keeps ownership). Pass unassign_assignee / unassign_agent to clear a field.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: STRING,
        story_id: { ...OPTIONAL_ID, description: 'Story UUID or identifier (e.g. LAN-2)' },
        assignee_id: { ...OPTIONAL_ID, description: 'Human user id or member name' },
        delegate_agent_id: { ...OPTIONAL_ID, description: 'Agent id or agent name' },
        unassign_assignee: { type: 'boolean', description: 'Clear the human assignee' },
        unassign_agent: { type: 'boolean', description: 'Clear the agent delegate' },
      },
      required: ['story_id'],
    },
    requiredScopes: [MCP_SCOPES.STORIES_WRITE, MCP_SCOPES.APP_ASSIGNABLE],
    isWrite: true,
    handler: async ({ service }, args) => {
      const input: { assignee_id?: string | null; delegate_agent_id?: string | null } = {};
      const assignee = str(args, 'assignee_id');
      const delegate = str(args, 'delegate_agent_id');
      if (args.unassign_assignee === true) {
        input.assignee_id = null;
      } else if (assignee) {
        input.assignee_id = assignee;
      }
      if (args.unassign_agent === true) {
        input.delegate_agent_id = null;
      } else if (delegate) {
        input.delegate_agent_id = delegate;
      }
      if (Object.keys(input).length === 0) {
        throw new ToolInputError('Provide assignee_id, delegate_agent_id, or an unassign flag');
      }
      return service.assignStory(requireStr(args, 'story_id'), input);
    },
  },
  {
    name: 'epic.assign',
    title: 'Assign Epic',
    description:
      'Assign an Epic to a member (Epic, never Project). A human becomes the lead; an AGENT becomes the delegate — a first-class assignee that can drive the Epic. Pass unassign_lead / unassign_agent to clear a field.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: STRING,
        epic_id: STRING,
        lead_id: { ...STRING, description: 'Human user id to lead the Epic' },
        delegate_agent_id: { ...STRING, description: 'Agent id to assign as delegate driver' },
        unassign_lead: { type: 'boolean', description: 'Clear the human lead' },
        unassign_agent: { type: 'boolean', description: 'Clear the agent delegate' },
      },
      required: ['epic_id'],
    },
    requiredScopes: [MCP_SCOPES.EPICS_WRITE, MCP_SCOPES.APP_ASSIGNABLE],
    isWrite: true,
    handler: async ({ service }, args) => {
      const input: { lead_id?: string | null; delegate_agent_id?: string | null } = {};
      const lead = str(args, 'lead_id');
      const delegate = str(args, 'delegate_agent_id');
      if (args.unassign_lead === true) {
        input.lead_id = null;
      } else if (lead) {
        input.lead_id = lead;
      }
      if (args.unassign_agent === true) {
        input.delegate_agent_id = null;
      } else if (delegate) {
        input.delegate_agent_id = delegate;
      }
      if (Object.keys(input).length === 0) {
        throw new ToolInputError('Provide lead_id, delegate_agent_id, or an unassign flag');
      }
      return service.assignEpic(requireStr(args, 'epic_id'), input);
    },
  },
  {
    name: 'story.decompose',
    title: 'Decompose Story',
    description:
      'Break a parent Story into sub-Stories (MCP-IDE-001). Creates one child Story per provided title under the same team/Epic.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: STRING,
        team_id: OPTIONAL_ID,
        workflow_state_id: {
          ...OPTIONAL_ID,
          description: 'Optional — defaults to backlog; accepts done/complete/backlog',
        },
        status: { ...OPTIONAL_ID, description: 'Alias for workflow_state_id' },
        epic_id: { ...OPTIONAL_ID, description: 'Epic UUID or slug/name' },
        subtasks: { type: 'array', items: STRING, description: 'Titles for the child Stories' },
      },
      required: ['subtasks'],
    },
    requiredScopes: [MCP_SCOPES.STORIES_CREATE],
    isWrite: true,
    handler: async ({ service }, args) => {
      const subtasks = toStringArray(args.subtasks);
      if (subtasks.length === 0) {
        throw new ToolInputError('subtasks must be a non-empty array of titles');
      }
      const teamId = requireStr(args, 'team_id');
      const workflowStateId = requireStr(args, 'workflow_state_id');
      const epicId = str(args, 'epic_id') ?? null;
      const created: unknown[] = [];
      for (const title of subtasks) {
        const result = await service.createStory({
          team_id: teamId,
          title,
          workflow_state_id: workflowStateId,
          epic_id: epicId,
        });
        created.push(result.entity);
      }
      return { created, count: created.length };
    },
  },

  // ---------------------------------------------------------------- comments
  {
    name: 'comment.create',
    title: 'Create Comment',
    description: 'Comment on a Story or Epic as a first-class actor.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: STRING,
        story_id: STRING,
        epic_id: STRING,
        body_md: STRING,
      },
      required: ['body_md'],
    },
    requiredScopes: [MCP_SCOPES.COMMENTS_CREATE],
    isWrite: true,
    handler: async ({ service }, args) => {
      assertCommentTarget(args);
      return service.createComment({
        story_id: str(args, 'story_id') ?? null,
        epic_id: str(args, 'epic_id') ?? null,
        body_md: requireStr(args, 'body_md'),
      });
    },
  },
  {
    name: 'comment.reply',
    title: 'Reply to Comment',
    description: 'Reply to an existing comment thread on a Story or Epic.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: STRING,
        parent_id: STRING,
        story_id: STRING,
        epic_id: STRING,
        body_md: STRING,
      },
      required: ['parent_id', 'body_md'],
    },
    requiredScopes: [MCP_SCOPES.COMMENTS_CREATE],
    isWrite: true,
    handler: async ({ service }, args) => {
      assertCommentTarget(args);
      return service.createComment({
        story_id: str(args, 'story_id') ?? null,
        epic_id: str(args, 'epic_id') ?? null,
        parent_id: requireStr(args, 'parent_id'),
        body_md: requireStr(args, 'body_md'),
      });
    },
  },
  {
    name: 'comment.create_as_proxy',
    title: 'Create Comment as Proxy',
    description:
      'Post a comment on behalf of a human user (attribution renders "Agent on behalf of <user>"). MCP-IDE-002 proxy authorship.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: STRING,
        story_id: STRING,
        epic_id: STRING,
        on_behalf_of_user_id: STRING,
        body_md: STRING,
      },
      required: ['on_behalf_of_user_id', 'body_md'],
    },
    requiredScopes: [MCP_SCOPES.COMMENTS_CREATE],
    isWrite: true,
    handler: async ({ service }, args) => {
      assertCommentTarget(args);
      return service.createComment({
        story_id: str(args, 'story_id') ?? null,
        epic_id: str(args, 'epic_id') ?? null,
        body_md: requireStr(args, 'body_md'),
        actor_type: 'agent',
        on_behalf_of_user_id: requireStr(args, 'on_behalf_of_user_id'),
      });
    },
  },

  // ----------------------------------------------------------------- signals
  {
    name: 'signal.attach',
    title: 'Attach Engineering Signal',
    description:
      'Attach an engineering signal (CI / QA / observability with correlation ids) to a Story or Epic. MCP-IDE-003.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: STRING,
        story_id: STRING,
        epic_id: STRING,
        signal: {
          type: 'object',
          description: 'Signal payload (e.g. { kind: "ci", status: "passed", url, correlation_id })',
        },
      },
      required: ['signal'],
    },
    requiredScopes: [MCP_SCOPES.SIGNALS_WRITE],
    isWrite: true,
    handler: async ({ service }, args) => {
      assertCommentTarget(args);
      const signal = args.signal;
      if (typeof signal !== 'object' || signal === null || Array.isArray(signal)) {
        throw new ToolInputError('signal must be an object');
      }
      return service.attachSignal({
        story_id: str(args, 'story_id') ?? null,
        epic_id: str(args, 'epic_id') ?? null,
        signal: signal as Record<string, unknown>,
      });
    },
  },

  // ---------------------------------------------------------------------- ai
  {
    name: 'ai.draft_story',
    title: 'Draft Story with AI',
    description:
      'Use AI (via Cloudflare AI Gateway) to draft a Story title, description, and acceptance criteria from a natural-language prompt. Returns a suggestion; does not persist. Pair with story.create to save.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: STRING,
        prompt: { ...STRING, description: 'What the Story should accomplish' },
        context: { ...STRING, description: 'Optional additional context (Epic, constraints, links)' },
      },
      required: ['prompt'],
    },
    requiredScopes: [MCP_SCOPES.READ],
    isWrite: false,
    handler: async ({ gateway, principal, workspaceId }, args) => {
      if (!gateway.isConfigured()) {
        throw new ToolInputError(
          'AI Gateway is not configured on this deployment (missing CLOUDFLARE_AI_GATEWAY_ENDPOINT/TOKEN)'
        );
      }
      const prompt = requireStr(args, 'prompt');
      const context = str(args, 'context');
      try {
        const completion = await gateway.chatCompletion({
          messages: [
            {
              role: 'system',
              content:
                'You are a product engineer drafting a well-scoped Story (never call it a Project or Issue). ' +
                'Return concise Markdown with: a one-line title, a short description, and a bulleted "Acceptance Criteria" list.',
            },
            {
              role: 'user',
              content: context ? `${prompt}\n\nContext:\n${context}` : prompt,
            },
          ],
          temperature: 0.4,
          maxTokens: 600,
          metadata: {
            workspace_id: workspaceId,
            agent_id: principal.agentId ?? undefined,
            user_id: principal.userId ?? undefined,
            feature: 'draft_story',
          },
          cacheTtlSeconds: 60,
          requestTimeoutMs: 30000,
        });
        return {
          draft_markdown: completion.content,
          model: completion.model,
          cache_status: completion.cacheStatus,
          usage: completion.usage,
        };
      } catch (err) {
        if (err instanceof AiGatewayNotConfiguredError) {
          throw new ToolInputError(err.message);
        }
        throw err;
      }
    },
  },

  // ------------------------------------------------------------------ agents
  {
    name: 'agent.list',
    title: 'List Agents',
    description: 'List agent members in the workspace (assignable/mentionable app users).',
    inputSchema: { type: 'object', properties: { workspace_id: STRING } },
    requiredScopes: [MCP_SCOPES.READ],
    isWrite: false,
    handler: async ({ service }) => {
      const agents = await service.listAgents();
      return { agents, count: agents.length };
    },
  },
  {
    name: 'members.list',
    title: 'List Assignable Members',
    description:
      'List the unified assignee roster: human members and AGENTS together, each with a `kind` of "human" or "agent". Use this to discover valid targets for story.assign / epic.assign — agents are first-class members alongside people.',
    inputSchema: { type: 'object', properties: { workspace_id: STRING } },
    requiredScopes: [MCP_SCOPES.READ],
    isWrite: false,
    handler: async ({ service }) => {
      const members = await service.listMembers();
      return { members, count: members.length };
    },
  },
];

/** Cursor MCP descriptors replace dots with underscores (e.g. story.list → story_list). */
export function toCursorToolAlias(dotName: string): string {
  return dotName.replace(/\./g, '_');
}

export const TOOLS_BY_NAME: Map<string, ToolDefinition> = (() => {
  const map = new Map<string, ToolDefinition>();
  for (const tool of MCP_TOOLS) {
    map.set(tool.name, tool);
    const cursorAlias = toCursorToolAlias(tool.name);
    if (cursorAlias !== tool.name) {
      map.set(cursorAlias, tool);
    }
  }
  return map;
})();

export function toolListForClient(): Array<{
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
}> {
  return MCP_TOOLS.map(({ name, title, description, inputSchema }) => ({
    name,
    title,
    description,
    inputSchema,
  }));
}

// --- helpers --------------------------------------------------------------

function toLimit(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(Math.max(Math.trunc(value), 1), 100);
  }
  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
}

function pickDefined(args: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (args[key] !== undefined && args[key] !== null && args[key] !== '') {
      out[key] = args[key];
    }
  }
  return out;
}

function assertCommentTarget(args: Record<string, unknown>): void {
  const hasStory = Boolean(str(args, 'story_id'));
  const hasEpic = Boolean(str(args, 'epic_id'));
  if (hasStory === hasEpic) {
    throw new ToolInputError('Provide exactly one of story_id or epic_id');
  }
}
