/**
 * Wire protocol between the `/api/chat` route (server) and `useAgentChat` (client).
 *
 * The route streams newline-delimited JSON (NDJSON) stream events; the client
 * reconstructs AI SDK-style message parts from them. This mirrors the AI
 * Elements message-part model without taking a runtime dependency on the Vercel
 * AI SDK — the transport underneath is the OpenAI-compatible Cloudflare AI
 * Gateway SSE (or a deterministic mock when the gateway is not configured).
 */
import type { ToolFieldDiff } from '@landi-flow/ui';

export interface ChatRequestMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequestBody {
  messages: ChatRequestMessage[];
  model?: string;
  agentId?: string;
  workspaceId?: string;
  /** Client fallback when session/API context is unavailable (mock auth). */
  teamId?: string;
}

export interface ApplyToolRequestBody {
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
  workspaceId?: string;
  agentId?: string;
  /** Client fallback active team when server session context is unavailable. */
  teamId?: string;
}

export interface ApplyToolResponseBody {
  ok: boolean;
  output?: unknown;
  errorText?: string;
  /** Assistant confirmation markdown appended after a successful apply. */
  appliedText?: string;
  /** True when applied against the live MCP worker; false when mock-applied. */
  live: boolean;
}

// --- stream events ---------------------------------------------------------

export interface ReasoningDeltaEvent {
  type: 'reasoning-delta';
  text: string;
}
export interface ReasoningDoneEvent {
  type: 'reasoning-done';
  durationMs: number;
}
export interface TextDeltaEvent {
  type: 'text-delta';
  text: string;
}
export interface ToolProposalEvent {
  type: 'tool';
  toolCallId: string;
  toolName: string;
  title: string;
  input: Record<string, unknown>;
  isWrite: boolean;
  requiresApproval: boolean;
  summary: string;
  diff: ToolFieldDiff[];
}
export interface ToolResultEvent {
  type: 'tool-result';
  toolCallId: string;
  output: unknown;
}
export interface SourceEvent {
  type: 'source';
  id: string;
  url: string;
  title: string;
  snippet: string;
}
export interface MetaEvent {
  type: 'meta';
  model: string;
  live: boolean;
}
export interface DoneEvent {
  type: 'done';
}
export interface ErrorEvent {
  type: 'error';
  message: string;
}

export type StreamEvent =
  | MetaEvent
  | ReasoningDeltaEvent
  | ReasoningDoneEvent
  | TextDeltaEvent
  | ToolProposalEvent
  | ToolResultEvent
  | SourceEvent
  | DoneEvent
  | ErrorEvent;

export function encodeEvent(event: StreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}

/** Parse a buffer of NDJSON, returning parsed events and the trailing remainder. */
export function drainEvents(buffer: string): {
  events: StreamEvent[];
  rest: string;
} {
  const events: StreamEvent[] = [];
  let rest = buffer;
  let newlineIndex = rest.indexOf('\n');
  while (newlineIndex !== -1) {
    const line = rest.slice(0, newlineIndex).trim();
    rest = rest.slice(newlineIndex + 1);
    if (line.length > 0) {
      try {
        events.push(JSON.parse(line) as StreamEvent);
      } catch {
        // Ignore partial/garbage lines; the caller retries with more data.
      }
    }
    newlineIndex = rest.indexOf('\n');
  }
  return { events, rest };
}
