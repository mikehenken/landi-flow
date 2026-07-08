'use client';

import * as React from 'react';
import type {
  AgentChatStatus,
  MessageAuthor,
  MessagePart,
  ReasoningPart,
  TextPart,
  ToolPart,
  UIMessage,
} from '@landi-flow/ui';
import {
  drainEvents,
  type ApplyToolResponseBody,
  type ChatRequestMessage,
  type StreamEvent,
} from '@/lib/agent-chat/protocol';
import { CURRENT_USER } from '@/lib/agent-roster';

export interface UseAgentChatOptions {
  /** Author attributed to assistant messages (the agent you are chatting with). */
  agentAuthor: MessageAuthor;
  model: string;
  workspaceId?: string;
  initialMessages?: UIMessage[];
}

export interface UseAgentChatResult {
  messages: UIMessage[];
  status: AgentChatStatus;
  error: string | null;
  sendMessage: (text: string) => void;
  stop: () => void;
  approveTool: (messageId: string, toolCallId: string) => void;
  rejectTool: (messageId: string, toolCallId: string) => void;
  /** True while at least one write proposal awaits human approval. */
  hasPendingApproval: boolean;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Turn a raw fetch failure into an actionable message. A browser `TypeError`
 * from `fetch` (e.g. "Failed to fetch") means the request never reached the
 * server — the dev server is down, or the agent chat endpoint is unreachable —
 * so we surface that plainly instead of the cryptic native string.
 */
function toReadableError(err: unknown): string {
  if (err instanceof TypeError) {
    return 'Could not reach the agent service. Is the app server running? (agent inference is served by /api/chat).';
  }
  return err instanceof Error ? err.message : 'Chat stream failed';
}

/**
 * Streaming agent-chat state (an AI SDK `useChat`-style hook, dependency-free).
 * Reconstructs message parts from the `/api/chat` NDJSON stream and drives the
 * Agent Handoff Queue: write proposals stay pending until `approveTool`, which
 * POSTs to `/api/agent/apply`.
 */
export function useAgentChat({
  agentAuthor,
  model,
  workspaceId,
  initialMessages = [],
}: UseAgentChatOptions): UseAgentChatResult {
  const [messages, setMessages] = React.useState<UIMessage[]>(initialMessages);
  const [status, setStatus] = React.useState<AgentChatStatus>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const updateMessage = React.useCallback(
    (messageId: string, updater: (message: UIMessage) => UIMessage) => {
      setMessages((prev) =>
        prev.map((message) => (message.id === messageId ? updater(message) : message)),
      );
    },
    [],
  );

  const applyEvent = React.useCallback(
    (assistantId: string, event: StreamEvent) => {
      switch (event.type) {
        case 'reasoning-delta':
          updateMessage(assistantId, (m) => upsertReasoning(m, event.text, true, null));
          break;
        case 'reasoning-done':
          updateMessage(assistantId, (m) => finishReasoning(m, event.durationMs));
          break;
        case 'text-delta':
          updateMessage(assistantId, (m) => upsertText(m, event.text));
          break;
        case 'tool':
          updateMessage(assistantId, (m) =>
            addPart(m, {
              type: 'tool',
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              title: event.title,
              state: 'input-available',
              input: event.input,
              isWrite: event.isWrite,
              requiresApproval: event.requiresApproval,
              approvalState: event.requiresApproval ? 'pending' : undefined,
              summary: event.summary,
              diff: event.diff,
            }),
          );
          break;
        case 'tool-result':
          updateMessage(assistantId, (m) =>
            patchTool(m, event.toolCallId, (tool) => ({
              ...tool,
              state: 'output-available',
              output: event.output,
            })),
          );
          break;
        case 'source':
          updateMessage(assistantId, (m) =>
            addPart(m, {
              type: 'source',
              id: event.id,
              url: event.url,
              title: event.title,
              snippet: event.snippet,
            }),
          );
          break;
        case 'error':
          setError(event.message);
          setStatus('error');
          break;
        case 'done':
        case 'meta':
        default:
          break;
      }
    },
    [updateMessage],
  );

  const sendMessage = React.useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0 || status === 'streaming' || status === 'submitted') {
        return;
      }
      setError(null);

      const userMessage: UIMessage = {
        id: uid('msg-u'),
        role: 'user',
        author: CURRENT_USER,
        parts: [{ type: 'text', text: trimmed }],
        createdAt: new Date().toISOString(),
      };
      const assistantId = uid('msg-a');
      const assistantMessage: UIMessage = {
        id: assistantId,
        role: 'assistant',
        author: agentAuthor,
        parts: [],
        createdAt: new Date().toISOString(),
      };

      // Build the request transcript from prior + new user turns.
      const priorTurns: ChatRequestMessage[] = [];
      for (const message of messages) {
        const merged = mergeTextParts(message.parts);
        if (merged.length > 0 && (message.role === 'user' || message.role === 'assistant')) {
          priorTurns.push({ role: message.role, content: merged });
        }
      }
      priorTurns.push({ role: 'user', content: trimmed });

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setStatus('submitted');

      const controller = new AbortController();
      abortRef.current = controller;

      void (async () => {
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: priorTurns, model, workspaceId, agentId: agentAuthor.id }),
            signal: controller.signal,
          });
          if (!response.ok || !response.body) {
            throw new Error(`Chat request failed (${response.status})`);
          }
          setStatus('streaming');
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const { events, rest } = drainEvents(buffer);
            buffer = rest;
            for (const event of events) {
              applyEvent(assistantId, event);
            }
          }
          setStatus((prev) => (prev === 'error' ? 'error' : 'ready'));
        } catch (err) {
          if (controller.signal.aborted) {
            setStatus('ready');
            return;
          }
          setError(toReadableError(err));
          setStatus('error');
        } finally {
          abortRef.current = null;
        }
      })();
    },
    [agentAuthor, applyEvent, messages, model, status, workspaceId],
  );

  const stop = React.useCallback(() => {
    abortRef.current?.abort();
    setStatus('ready');
  }, []);

  const resolveTool = React.useCallback(
    async (messageId: string, toolCallId: string, approve: boolean) => {
      let target: ToolPart | undefined;
      setMessages((prev) =>
        prev.map((message) => {
          if (message.id !== messageId) return message;
          return {
            ...message,
            parts: message.parts.map((part) => {
              if (part.type === 'tool' && part.toolCallId === toolCallId) {
                target = part;
                return {
                  ...part,
                  approvalState: approve ? 'approved' : 'rejected',
                } satisfies ToolPart;
              }
              return part;
            }),
          };
        }),
      );

      if (!approve || !target) {
        return;
      }

      try {
        const response = await fetch('/api/agent/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toolCallId,
            toolName: target.toolName,
            input: target.input ?? {},
            workspaceId,
          }),
        });
        const result = (await response.json()) as ApplyToolResponseBody;
        updateMessage(messageId, (m) => {
          const patched = patchTool(m, toolCallId, (tool) => ({
            ...tool,
            state: result.ok ? 'output-available' : 'output-error',
            output: result.output,
            errorText: result.errorText,
          }));
          return result.ok && result.appliedText
            ? upsertText(patched, `\n\n${result.appliedText}`)
            : patched;
        });
      } catch (err) {
        updateMessage(messageId, (m) =>
          patchTool(m, toolCallId, (tool) => ({
            ...tool,
            state: 'output-error',
            errorText: err instanceof Error ? err.message : 'Apply failed',
          })),
        );
      }
    },
    [updateMessage, workspaceId],
  );

  const approveTool = React.useCallback(
    (messageId: string, toolCallId: string) => void resolveTool(messageId, toolCallId, true),
    [resolveTool],
  );
  const rejectTool = React.useCallback(
    (messageId: string, toolCallId: string) => void resolveTool(messageId, toolCallId, false),
    [resolveTool],
  );

  const hasPendingApproval = React.useMemo(
    () =>
      messages.some((message) =>
        message.parts.some(
          (part) =>
            part.type === 'tool' &&
            part.requiresApproval === true &&
            part.approvalState === 'pending',
        ),
      ),
    [messages],
  );

  return {
    messages,
    status,
    error,
    sendMessage,
    stop,
    approveTool,
    rejectTool,
    hasPendingApproval,
  };
}

// --- part reducers ---------------------------------------------------------

function addPart(message: UIMessage, part: MessagePart): UIMessage {
  return { ...message, parts: [...message.parts, part] };
}

function upsertText(message: UIMessage, delta: string): UIMessage {
  const index = message.parts.findIndex((p) => p.type === 'text');
  if (index === -1) {
    return addPart(message, { type: 'text', text: delta });
  }
  const parts = message.parts.slice();
  const existing = parts[index] as TextPart;
  parts[index] = { ...existing, text: existing.text + delta };
  return { ...message, parts };
}

function upsertReasoning(
  message: UIMessage,
  delta: string,
  isStreaming: boolean,
  durationMs: number | null,
): UIMessage {
  const index = message.parts.findIndex((p) => p.type === 'reasoning');
  if (index === -1) {
    return addPart(message, { type: 'reasoning', text: delta, isStreaming, durationMs });
  }
  const parts = message.parts.slice();
  const existing = parts[index] as ReasoningPart;
  parts[index] = { ...existing, text: existing.text + delta, isStreaming };
  return { ...message, parts };
}

function finishReasoning(message: UIMessage, durationMs: number): UIMessage {
  const index = message.parts.findIndex((p) => p.type === 'reasoning');
  if (index === -1) return message;
  const parts = message.parts.slice();
  const existing = parts[index] as ReasoningPart;
  parts[index] = { ...existing, isStreaming: false, durationMs };
  return { ...message, parts };
}

function patchTool(
  message: UIMessage,
  toolCallId: string,
  patch: (tool: ToolPart) => ToolPart,
): UIMessage {
  return {
    ...message,
    parts: message.parts.map((part) =>
      part.type === 'tool' && part.toolCallId === toolCallId ? patch(part) : part,
    ),
  };
}

function mergeTextParts(parts: MessagePart[]): string {
  return parts
    .filter((p): p is TextPart => p.type === 'text')
    .map((p) => p.text)
    .join('\n')
    .trim();
}
