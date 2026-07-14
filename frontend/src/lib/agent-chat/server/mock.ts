// Server-only module. Deterministic mock inference used when the Cloudflare AI
// Gateway is not configured (no keys) or FLOW_AI_FAKE is set. It exercises every
// UI surface — reasoning, streaming markdown, MCP tool use, an Agent Handoff Queue
// write proposal, and citations — so the agent UI is fully demonstrable and
// E2E-testable without secrets. Mirrors the shadcn.io demo's mocked streaming.
import type { StreamEvent } from '../protocol';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

interface MockIntent {
  reasoning: string;
  text: string;
  writeTool: {
    name: string;
    title: string;
    input: Record<string, unknown>;
    summary: string;
    diff: { field: string; before: string | null; after: string | null }[];
  } | null;
}

function classify(userText: string): MockIntent {
  const text = userText.toLowerCase();
  const wantsCreate = /\b(create|draft|add|new|write)\b/.test(text) && /story|task|ticket|item/.test(text);
  const wantsUpdate = /\b(update|change|rename|move|set|mark|reprioriti[sz]e|bump)\b/.test(text);

  if (wantsCreate) {
    const title = extractTitle(userText) ?? 'New Story from agent draft';
    return {
      reasoning:
        'The user wants a new **Story** (never a Project). I will draft a well-scoped Story with acceptance criteria, then propose a `story.create` write for human approval via the Agent Handoff Queue.',
      text:
        `## ${title}\n\n` +
        'Proposed Story drafted from your request.\n\n' +
        '**Acceptance Criteria**\n' +
        '- Behavior is discoverable from the workspace UI\n' +
        '- Works with keyboard-first navigation\n' +
        '- Covered by an automated test\n\n' +
        'I have prepared a `story.create` proposal below — review the diff and approve to apply it.',
      writeTool: {
        name: 'story.create',
        title: 'Create Story',
        input: {
          team_id: 'team-design',
          title,
          epic_id: 'epic-001',
          priority: 'medium',
          delegate_agent_id: 'agent-landi-flow-builtin',
        },
        summary: `Create Story “${title}” on Team Design, attach to Epic “Progressive Disclosure Shell”, delegate to Cursor Agent.`,
        diff: [
          { field: 'title', before: null, after: title },
          { field: 'epic', before: null, after: 'Progressive Disclosure Shell' },
          { field: 'priority', before: null, after: 'medium' },
          { field: 'delegate', before: null, after: 'Cursor Agent' },
        ],
      },
    };
  }

  if (wantsUpdate) {
    return {
      reasoning:
        'This is a mutation on an existing Story. I will resolve the Story, compute the change, and propose a `story.update` write for approval rather than applying it silently.',
      text:
        'I found the Story and prepared an update. Because this changes workspace data, it is a **proposal** — approve the diff below to apply it through the Agent Action Bus.',
      writeTool: {
        name: 'story.update',
        title: 'Update Story',
        input: {
          team_id: 'team-design',
          story_id: 'LAN-2',
          priority: 'high',
        },
        summary: 'Raise priority of Story LAN-2 “Command palette with suggested actions” to High.',
        diff: [{ field: 'priority', before: 'medium', after: 'high' }],
      },
    };
  }

  return {
    reasoning:
      'This is a read/triage question. I can answer directly and cite the workspace context. No write is required.',
    text:
      'Here is what I found across your **Epics** and **Stories**:\n\n' +
      '- **Progressive Disclosure Shell** is *in progress* with 3 Stories (1 done).\n' +
      '- **Agent Collaboration Plane** is *planned* — this is where agent-as-member work lives.\n' +
      '- The **Inbox** has active Stories awaiting triage.\n\n' +
      'Ask me to *draft a Story* or *update a Story* and I will prepare a governed proposal for your approval.',
    writeTool: null,
  };
}

function extractTitle(userText: string): string | null {
  const quoted = /["“”']([^"“”']{3,80})["“”']/.exec(userText);
  if (quoted && quoted[1]) return quoted[1].trim();
  const after = /(?:story|task|ticket)\s+(?:for|to|about)\s+(.{3,80})/i.exec(userText);
  if (after && after[1]) {
    return after[1].trim().replace(/[.?!]+$/, '');
  }
  return null;
}

function chunk(text: string, size: number): string[] {
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    parts.push(text.slice(i, i + size));
  }
  return parts;
}

export async function* mockStream(
  userText: string,
  model: string,
): AsyncGenerator<StreamEvent> {
  yield { type: 'meta', model, live: false };

  const intent = classify(userText);
  const started = Date.now();

  // Reasoning stream.
  for (const piece of chunk(intent.reasoning, 24)) {
    yield { type: 'reasoning-delta', text: piece };
    await sleep(30);
  }
  yield { type: 'reasoning-done', durationMs: Date.now() - started };

  // A read tool call (MCP tool use) rendered in-thread.
  yield {
    type: 'tool',
    toolCallId: 'call-search-1',
    toolName: 'flow.search',
    title: 'Search Stories',
    input: { query: userText.slice(0, 40) },
    isWrite: false,
    requiresApproval: false,
    summary: 'Search Stories',
    diff: [],
  };
  await sleep(120);
  yield {
    type: 'tool-result',
    toolCallId: 'call-search-1',
    output: { count: 6, matched: ['LAN-2', 'LAN-4'] },
  };

  // Streaming markdown answer.
  for (const piece of chunk(intent.text, 18)) {
    yield { type: 'text-delta', text: piece };
    await sleep(22);
  }

  // Write proposal → Agent Handoff Queue (requires human approval).
  if (intent.writeTool) {
    await sleep(80);
    yield {
      type: 'tool',
      toolCallId: 'call-write-1',
      toolName: intent.writeTool.name,
      title: intent.writeTool.title,
      input: intent.writeTool.input,
      isWrite: true,
      requiresApproval: true,
      summary: intent.writeTool.summary,
      diff: intent.writeTool.diff,
    };
  }

  // Citations.
  yield {
    type: 'source',
    id: 'src-1',
    url: 'https://linear.app/method',
    title: 'The Linear Method',
    snippet: 'Principles for building product with momentum and clarity.',
  };
  yield {
    type: 'source',
    id: 'src-2',
    url: 'https://modelcontextprotocol.io',
    title: 'Model Context Protocol',
    snippet: 'Open protocol connecting AI agents to tools and data (MCP).',
  };

  yield { type: 'done' };
}
