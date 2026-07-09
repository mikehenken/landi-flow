import type { NextRequest } from 'next/server';
import { assignAndAct, type AssignAgentRequest, type AssignEntity } from '@/lib/agents/assign-agent';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Assign a member to a Story/Epic and — when an AGENT is assigned — have it act, all
 * through the MCP Agent Action Bus (task-09k acceptance). The assignment is a governed
 * write; the assigned agent then behaves like a freshly-assigned developer (pick-up
 * comment + started signal). Without a configured MCP worker the flow mock-applies so
 * it is demonstrable end-to-end in dev.
 */
export async function POST(request: NextRequest): Promise<Response> {
  let body: Partial<AssignAgentRequest>;
  try {
    body = (await request.json()) as Partial<AssignAgentRequest>;
  } catch {
    return Response.json({ ok: false, errorText: 'Invalid JSON body' }, { status: 400 });
  }

  const entity = body.entity;
  if (entity !== 'story' && entity !== 'epic') {
    return Response.json({ ok: false, errorText: 'entity must be "story" or "epic"' }, { status: 400 });
  }
  if (!body.entityId || typeof body.entityId !== 'string') {
    return Response.json({ ok: false, errorText: 'entityId is required' }, { status: 400 });
  }

  const result = await assignAndAct({
    entity: entity as AssignEntity,
    entityId: body.entityId,
    workspaceId: body.workspaceId,
    delegateAgentId: body.delegateAgentId,
    humanId: body.humanId,
    entityLabel: body.entityLabel,
  });

  return Response.json(result, { status: result.ok ? 200 : 502 });
}
