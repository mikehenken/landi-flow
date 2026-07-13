/**
 * Message-part contract for the AI/agent conversation surface.
 *
 * Mirrors the Vercel AI SDK "UIMessage parts" model that shadcn.io/ai (the
 * community repackage of AI Elements) renders — see study task-04m research.
 * These primitives are the *owned source* the clone standardizes on so the AI
 * surface is white-labelable (CSS-variable themed) and free of a Pro-gated
 * runtime dependency.
 *
 * HITM nomenclature: the platform noun is **Epic** (never Project) and **Story**;
 * tool names and copy that reference work items use those terms.
 */

/** Four-value stream status consumed by PromptInputSubmit / Loader. */
export type AgentChatStatus = 'idle' | 'submitted' | 'streaming' | 'ready' | 'error';

/** ToolUIPart lifecycle (AI SDK parity). */
export type ToolState =
  | 'input-streaming'
  | 'input-available'
  | 'output-available'
  | 'output-error';

/** Agent Handoff Queue governance state for write-capable tools (IDEA-003). */
export type ApprovalState = 'pending' | 'approved' | 'rejected' | 'failed';

export type MessageRole = 'user' | 'assistant' | 'system';

/** First-class collaborator descriptor — humans and agents share this shape. */
export interface MessageAuthor {
  id: string;
  name: string;
  actorType: 'human' | 'agent' | 'system';
  /** 1–2 char fallback for the avatar. */
  initials?: string;
  /** Optional image URL. */
  avatarUrl?: string;
}

export interface TextPart {
  type: 'text';
  text: string;
}

export interface ReasoningPart {
  type: 'reasoning';
  text: string;
  isStreaming?: boolean;
  durationMs?: number | null;
}

export interface SourcePart {
  type: 'source';
  id: string;
  url: string;
  title?: string;
  snippet?: string;
}

export interface ToolFieldDiff {
  field: string;
  before: string | null;
  after: string | null;
}

export interface ToolPart {
  type: 'tool';
  toolCallId: string;
  toolName: string;
  title?: string;
  state: ToolState;
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
  /** Write-capable tools flow through the Agent Handoff Queue. */
  isWrite?: boolean;
  requiresApproval?: boolean;
  approvalState?: ApprovalState;
  /** Human-readable summary of a proposed write, shown in the Confirmation gate. */
  summary?: string;
  /** Human-readable field-level diff shown in the Confirmation gate. */
  diff?: ToolFieldDiff[];
}

export type MessagePart = TextPart | ReasoningPart | SourcePart | ToolPart;

export interface UIMessage {
  id: string;
  role: MessageRole;
  author?: MessageAuthor;
  parts: MessagePart[];
  createdAt?: string;
}
