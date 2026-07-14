import type { NextRequest } from 'next/server';
import { proposeInboxTriage } from '@/lib/agents/triage-propose';

export const dynamic = 'force-dynamic';

/**
 * Native Landi Flow Agent — inbox triage proposals (Handoff Queue, not auto-apply).
 */
export async function POST(request: NextRequest): Promise<Response> {
  let body: { workspaceId?: string };
  try {
    body = (await request.json()) as { workspaceId?: string };
  } catch {
    return Response.json({ ok: false, errorText: 'Invalid JSON body' }, { status: 400 });
  }

  const workspaceId = body.workspaceId;
  if (!workspaceId || typeof workspaceId !== 'string') {
    return Response.json({ ok: false, errorText: 'workspaceId is required' }, { status: 400 });
  }

  const result = await proposeInboxTriage(workspaceId);
  return Response.json(result, { status: result.ok ? 200 : 502 });
}
