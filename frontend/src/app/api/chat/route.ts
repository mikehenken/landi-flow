import type { NextRequest } from 'next/server';
import {
  encodeEvent,
  type ChatRequestBody,
  type StreamEvent,
} from '@/lib/agent-chat/protocol';
import { isMockForced, resolveGatewayConfig } from '@/lib/agent-chat/server/gateway';
import { gatewayStream } from '@/lib/agent-chat/server/stream-gateway';
import { mockStream } from '@/lib/agent-chat/server/mock';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Agent chat endpoint. Streams an assistant turn as NDJSON message-part events.
 * Inference routes through the Cloudflare AI Gateway (OpenAI-compatible) when
 * configured; otherwise a deterministic mock is streamed so the UI works with no
 * secrets. Provider keys / gateway token are read server-side by NAME only and
 * never reach the client bundle.
 */
export async function POST(request: NextRequest): Promise<Response> {
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return Response.json({ error: 'messages is required' }, { status: 400 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const userText = lastUser?.content ?? '';

  const config = isMockForced() ? null : resolveGatewayConfig();

  const source: AsyncGenerator<StreamEvent> = config
    ? gatewayStream({
        config,
        model: body.model,
        messages,
        metadata: {
          workspace_id: body.workspaceId,
          agent_id: body.agentId,
          feature: 'agent_chat',
        },
        workspaceId: body.workspaceId,
      })
    : mockStream(userText, body.model ?? 'gemini-2.5-flash');

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of source) {
          controller.enqueue(encoder.encode(encodeEvent(event)));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stream failed';
        controller.enqueue(encoder.encode(encodeEvent({ type: 'error', message })));
        controller.enqueue(encoder.encode(encodeEvent({ type: 'done' })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
