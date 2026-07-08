// Server-only module. Streams an assistant turn from the Cloudflare AI Gateway's
// Google AI Studio provider passthrough (`:streamGenerateContent?alt=sse`) and
// re-emits AI SDK-style message-part events. WRITE tool calls become Agent Handoff
// Queue proposals (never auto-applied); READ tool calls are executed server-side
// and their results streamed back in-thread.
//
// We use the native provider passthrough rather than the OpenAI `/compat` unified
// endpoint because the latter is deprecated by Cloudflare and disabled on our
// gateway (returns AiGatewayError 2036/2019). Both share the same gateway origin,
// `cf-aig-authorization`, and metadata attribution.
import type { StreamEvent } from '../protocol';
import type { ChatRequestMessage } from '../protocol';
import {
  gatewayHeaders,
  nativeStreamUrl,
  normalizeModel,
  type GatewayConfig,
  type GatewayMetadata,
} from './gateway';
import { MCP_TOOL_CATALOGUE, TOOL_BY_NAME, geminiTools } from './mcp-catalogue';
import { applyTool } from './apply';

interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

interface GeminiPart {
  text?: string;
  thought?: boolean;
  functionCall?: { name?: string; args?: Record<string, unknown> };
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[]; role?: string };
  finishReason?: string | null;
}

const SYSTEM_PROMPT =
  'You are a first-class agent collaborator in Landi Flow, a Linear-class product tool. ' +
  'Use the platform nouns Epic (never Project) and Story. Use the provided tools to read ' +
  'workspace data. For any write, CALL the appropriate write tool with complete arguments; the ' +
  'client will require explicit human approval before applying it (Agent Handoff Queue). ' +
  'Answer concisely in Markdown.';

/** Map the wire transcript to Gemini `contents` (roles: `user` / `model`). */
function toGeminiContents(
  messages: ChatRequestMessage[],
): Array<{ role: string; parts: Array<{ text: string }> }> {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
}

export async function* gatewayStream(params: {
  config: GatewayConfig;
  model: string | undefined;
  messages: ChatRequestMessage[];
  metadata: GatewayMetadata;
  workspaceId?: string;
}): AsyncGenerator<StreamEvent> {
  const { config, messages, metadata, workspaceId } = params;
  const model = normalizeModel(config, params.model);

  yield { type: 'meta', model, live: true };

  const response = await fetch(nativeStreamUrl(config, model), {
    method: 'POST',
    headers: gatewayHeaders(config, { ...metadata, feature: 'agent_chat' }),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: toGeminiContents(messages),
      tools: geminiTools(),
      generationConfig: { temperature: 0.4 },
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok || !response.body) {
    const detail = await safeText(response);
    yield {
      type: 'error',
      message: `AI Gateway error (${response.status}): ${detail.slice(0, 300)}`,
    };
    yield { type: 'done' };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const functionCalls: GeminiFunctionCall[] = [];
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      newlineIndex = buffer.indexOf('\n');

      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload.length === 0 || payload === '[DONE]') continue;

      let parsed: { candidates?: GeminiCandidate[] };
      try {
        parsed = JSON.parse(payload) as { candidates?: GeminiCandidate[] };
      } catch {
        continue;
      }
      const parts = parsed.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.functionCall?.name) {
          functionCalls.push({
            name: part.functionCall.name,
            args: part.functionCall.args ?? {},
          });
          continue;
        }
        // Skip model "thought" summaries; stream only user-facing text.
        if (part.thought === true) continue;
        if (typeof part.text === 'string' && part.text.length > 0) {
          yield { type: 'text-delta', text: part.text };
        }
      }
    }
  }

  // Emit accumulated tool calls: writes → proposals; reads → execute + result.
  for (const call of functionCalls) {
    const def = TOOL_BY_NAME.get(call.name) ?? MCP_TOOL_CATALOGUE.find((t) => t.name === call.name);
    if (!def) continue;
    const input = call.args ?? {};
    const toolCallId = crypto.randomUUID();

    yield {
      type: 'tool',
      toolCallId,
      toolName: def.name,
      title: def.title,
      input,
      isWrite: def.isWrite,
      requiresApproval: def.isWrite,
      summary: def.summarize(input),
      diff: def.diff(input),
    };

    if (!def.isWrite) {
      const result = await applyTool({ toolName: def.name, input, workspaceId });
      yield {
        type: 'tool-result',
        toolCallId,
        output: result.ok ? result.output : { error: result.errorText },
      };
    }
  }

  yield { type: 'done' };
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
