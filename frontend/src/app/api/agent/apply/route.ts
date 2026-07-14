import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApplyToolRequestBody } from '@/lib/agent-chat/protocol';
import { applyTool } from '@/lib/agent-chat/server/apply';
import { resolveAgentWorkspaceContext } from '@/lib/agent-chat/server/resolve-workspace-context';
import { isMockAuthEnabled } from '@/lib/api/config';
import { isWorkspaceUuid } from '@/lib/workspace/is-workspace-uuid';

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

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const authToken = session?.access_token ?? null;

  if (body.workspaceId && !isWorkspaceUuid(body.workspaceId) && !isMockAuthEnabled()) {
    return Response.json(
      {
        ok: false,
        live: false,
        errorText:
          'Workspace is not resolved (non-UUID workspace id). Reload and retry after workspace bootstrap.',
      },
      { status: 400 },
    );
  }

  const workspaceContext = await resolveAgentWorkspaceContext({
    workspaceId: body.workspaceId,
    teamId: body.teamId,
    authToken,
  });

  const result = await applyTool({
    toolName: body.toolName,
    input: body.input ?? {},
    workspaceId: body.workspaceId,
    authToken,
    workspaceContext,
  });

  return Response.json(result, { status: result.ok ? 200 : 502 });
}
