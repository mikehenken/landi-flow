// Server-only module: imported exclusively by the /api/chat and /api/agent/apply
// route handlers, never by client components.
import type { ToolFieldDiff } from '@landi-flow/ui';

/**
 * Server-side mirror of the Landi Flow MCP tool catalogue (workers/mcp/src/mcp/
 * tools.ts). The `/api/chat` route advertises these as OpenAI-compatible function
 * tools to the AI Gateway; when the model calls a WRITE tool the route surfaces it
 * as an Agent Handoff Queue proposal instead of applying it (no silent writes).
 *
 * HITM nomenclature is enforced: Epic (never Project) and Story.
 */
export interface McpToolDef {
  name: string;
  title: string;
  description: string;
  isWrite: boolean;
  parameters: Record<string, unknown>;
  /** One-line human summary of a proposed write (for the Confirmation gate). */
  summarize: (input: Record<string, unknown>) => string;
  /** Field-level before/after diff for the Confirmation gate. */
  diff: (input: Record<string, unknown>) => ToolFieldDiff[];
}

function s(input: Record<string, unknown>, key: string): string | null {
  const v = input[key];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

export const MCP_TOOL_CATALOGUE: McpToolDef[] = [
  {
    name: 'flow.search',
    title: 'Search Stories',
    description: 'Full-text search Stories in the workspace by title or identifier.',
    isWrite: false,
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' }, limit: { type: 'integer' } },
      required: ['query'],
    },
    summarize: (i) => `Search Stories for “${s(i, 'query') ?? ''}”`,
    diff: () => [],
  },
  {
    name: 'epic.list',
    title: 'List Epics',
    description: 'List active Epics in the workspace (Epic, never Project).',
    isWrite: false,
    parameters: { type: 'object', properties: { limit: { type: 'integer' } } },
    summarize: () => 'List Epics',
    diff: () => [],
  },
  {
    name: 'epic.get',
    title: 'Get Epic',
    description: 'Fetch a single Epic by id.',
    isWrite: false,
    parameters: {
      type: 'object',
      properties: { epic_id: { type: 'string' } },
      required: ['epic_id'],
    },
    summarize: (i) => `Get Epic ${s(i, 'epic_id') ?? ''}`,
    diff: () => [],
  },
  {
    name: 'story.list',
    title: 'List Stories',
    description: 'List active Stories, optionally filtered by team.',
    isWrite: false,
    parameters: {
      type: 'object',
      properties: { team_id: { type: 'string' }, limit: { type: 'integer' } },
    },
    summarize: () => 'List Stories',
    diff: () => [],
  },
  {
    name: 'story.get',
    title: 'Get Story',
    description: 'Fetch a Story by UUID or human identifier (e.g. LAN-3).',
    isWrite: false,
    parameters: {
      type: 'object',
      properties: { story: { type: 'string' } },
      required: ['story'],
    },
    summarize: (i) => `Get Story ${s(i, 'story') ?? ''}`,
    diff: () => [],
  },
  {
    name: 'story.create',
    title: 'Create Story',
    description:
      'Create a Story on a team. Optionally attach to an Epic and/or delegate to an agent. This is a WRITE and requires human approval.',
    isWrite: true,
    parameters: {
      type: 'object',
      properties: {
        team_id: { type: 'string' },
        title: { type: 'string' },
        description_md: { type: 'string' },
        priority: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'] },
        epic_id: { type: 'string' },
        assignee_id: { type: 'string' },
        delegate_agent_id: { type: 'string' },
      },
      required: ['team_id', 'title'],
    },
    summarize: (i) =>
      `Create Story “${s(i, 'title') ?? 'Untitled'}”${s(i, 'epic_id') ? ` under Epic ${s(i, 'epic_id')}` : ''}`,
    diff: (i) => [
      { field: 'title', before: null, after: s(i, 'title') },
      { field: 'team', before: null, after: s(i, 'team_id') },
      { field: 'epic', before: null, after: s(i, 'epic_id') },
      { field: 'priority', before: null, after: s(i, 'priority') },
    ],
  },
  {
    name: 'story.update',
    title: 'Update Story',
    description:
      'Update a Story (title, description, workflow state, priority, epic). This is a WRITE and requires human approval.',
    isWrite: true,
    parameters: {
      type: 'object',
      properties: {
        team_id: { type: 'string' },
        story_id: { type: 'string' },
        title: { type: 'string' },
        description_md: { type: 'string' },
        workflow_state_id: { type: 'string' },
        priority: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'] },
        epic_id: { type: 'string' },
      },
      required: ['team_id', 'story_id'],
    },
    summarize: (i) => `Update Story ${s(i, 'story_id') ?? ''}`,
    diff: (i) =>
      ['title', 'priority', 'workflow_state_id', 'epic_id']
        .filter((k) => s(i, k))
        .map((k) => ({ field: k, before: null, after: s(i, k) })),
  },
  {
    name: 'story.assign',
    title: 'Assign Story',
    description:
      'Assign a Story to a member. A human becomes the assignee; an AGENT becomes the delegate (first-class assignee). This is a WRITE and requires human approval.',
    isWrite: true,
    parameters: {
      type: 'object',
      properties: {
        story_id: { type: 'string' },
        assignee_id: { type: 'string' },
        delegate_agent_id: { type: 'string' },
        unassign_assignee: { type: 'boolean' },
        unassign_agent: { type: 'boolean' },
      },
      required: ['story_id'],
    },
    summarize: (i) =>
      `Assign Story ${s(i, 'story_id') ?? ''}${s(i, 'delegate_agent_id') ? ` to agent ${s(i, 'delegate_agent_id')}` : ''}`,
    diff: (i) => [
      { field: 'assignee', before: null, after: s(i, 'assignee_id') },
      { field: 'agent delegate', before: null, after: s(i, 'delegate_agent_id') },
    ],
  },
  {
    name: 'epic.assign',
    title: 'Assign Epic',
    description:
      'Assign an Epic to a member (Epic, never Project). A human becomes the lead; an AGENT becomes the delegate. This is a WRITE and requires human approval.',
    isWrite: true,
    parameters: {
      type: 'object',
      properties: {
        epic_id: { type: 'string' },
        lead_id: { type: 'string' },
        delegate_agent_id: { type: 'string' },
        unassign_lead: { type: 'boolean' },
        unassign_agent: { type: 'boolean' },
      },
      required: ['epic_id'],
    },
    summarize: (i) =>
      `Assign Epic ${s(i, 'epic_id') ?? ''}${s(i, 'delegate_agent_id') ? ` to agent ${s(i, 'delegate_agent_id')}` : ''}`,
    diff: (i) => [
      { field: 'lead', before: null, after: s(i, 'lead_id') },
      { field: 'agent delegate', before: null, after: s(i, 'delegate_agent_id') },
    ],
  },
  {
    name: 'members.list',
    title: 'List Assignable Members',
    description:
      'List the unified assignee roster: humans and AGENTS together (each with kind "human" or "agent"). Use to find valid targets for story.assign / epic.assign.',
    isWrite: false,
    parameters: { type: 'object', properties: {} },
    summarize: () => 'List assignable members (humans + agents)',
    diff: () => [],
  },
  {
    name: 'comment.create',
    title: 'Create Comment',
    description:
      'Comment on a Story or Epic as a first-class actor. This is a WRITE and requires human approval.',
    isWrite: true,
    parameters: {
      type: 'object',
      properties: {
        story_id: { type: 'string' },
        epic_id: { type: 'string' },
        body_md: { type: 'string' },
      },
      required: ['body_md'],
    },
    summarize: (i) =>
      `Comment on ${s(i, 'story_id') ? `Story ${s(i, 'story_id')}` : `Epic ${s(i, 'epic_id') ?? ''}`}`,
    diff: (i) => [{ field: 'body', before: null, after: s(i, 'body_md') }],
  },
];

export const TOOL_BY_NAME = new Map(MCP_TOOL_CATALOGUE.map((t) => [t.name, t]));

/** OpenAI-compatible `tools` array for the AI Gateway chat completion request. */
export function openAiTools(): Array<Record<string, unknown>> {
  return MCP_TOOL_CATALOGUE.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Recursively convert a JSON-schema fragment to the Gemini `Schema` shape: the
 * `type` keyword must be an UPPERCASE enum (STRING, INTEGER, OBJECT, …). Other
 * keywords (properties, items, required, enum, description) pass through.
 */
function toGeminiSchema(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') return {};
  const input = schema as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === 'type' && typeof value === 'string') {
      out.type = value.toUpperCase();
    } else if (key === 'properties' && value && typeof value === 'object') {
      const props: Record<string, unknown> = {};
      for (const [propKey, propValue] of Object.entries(value as Record<string, unknown>)) {
        props[propKey] = toGeminiSchema(propValue);
      }
      out.properties = props;
    } else if (key === 'items') {
      out.items = toGeminiSchema(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Gemini `tools` array (one entry with `functionDeclarations`) for the native
 * Google AI Studio `generateContent` request. Tools with no parameters omit the
 * `parameters` field (Gemini rejects an empty OBJECT schema with no properties).
 */
export function geminiTools(): Array<Record<string, unknown>> {
  const functionDeclarations = MCP_TOOL_CATALOGUE.map((tool) => {
    const params = tool.parameters as { properties?: Record<string, unknown> };
    const hasProps = params.properties && Object.keys(params.properties).length > 0;
    return hasProps
      ? {
          name: tool.name,
          description: tool.description,
          parameters: toGeminiSchema(tool.parameters),
        }
      : { name: tool.name, description: tool.description };
  });
  return [{ functionDeclarations }];
}
