import type { NextRequest } from 'next/server';
import type { ApplyToolRequestBody } from '@/lib/agent-chat/protocol';
import { applyTool } from '@/lib/agent-chat/server/apply';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Applies an APPROVED agent write (the "approve" side of the Agent Handoff Queue).
 * The client calls this only after a human approves the Confirmation gate. When an
 * MCP worker is configured the write executes for real through the Agent Action
 * Bus; otherwise it is mock-applied. No write happens without this explicit call.
 */
export async function POST(request: NextRequest): Promise<Response> {
  let body: ApplyToolRequestBody;
  try {
    body = (await request.json()) as ApplyToolRequestBody;
  } catch {
    return Response.json({ ok: false, live: false, errorText: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.toolName || typeof body.toolName !== 'string') {
    return Response.json({ ok: false, live: false, errorText: 'toolName is required' }, { status: 400 });
  }

  const result = await applyTool({
    toolName: body.toolName,
    input: body.input ?? {},
    workspaceId: body.workspaceId,
  });

  return Response.json(result, { status: result.ok ? 200 : 502 });
}
