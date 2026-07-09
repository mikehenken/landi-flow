import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientIfConfigured } from '@/lib/supabase/server';
import { isMockAuthEnabled, parseAssignableMembers } from '@/lib/agents/roster-client';
import { MOCK_ASSIGNABLE_MEMBERS } from '@/lib/agents/mock-roster';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

type ListAssignableMembersRpcClient = {
  rpc: (
    fn: 'list_assignable_members',
    args: { p_workspace_id: string },
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

async function listAssignableMembers(
  client: ListAssignableMembersRpcClient,
  workspaceId: string,
): Promise<{ data: unknown; error: { message: string } | null }> {
  return client.rpc('list_assignable_members', { p_workspace_id: workspaceId });
}

/**
 * Unified assignable roster — humans + agents from `list_assignable_members` RPC.
 * Mock data is returned only when `NEXT_PUBLIC_MOCK_AUTH=true`.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const workspaceId = request.nextUrl.searchParams.get('workspace_id');
  if (!workspaceId || workspaceId.trim().length === 0) {
    return Response.json({ ok: false, errorText: 'workspace_id is required' }, { status: 400 });
  }

  if (isMockAuthEnabled()) {
    return Response.json({ ok: true, members: MOCK_ASSIGNABLE_MEMBERS, live: false });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await listAssignableMembers(
      supabase as unknown as ListAssignableMembersRpcClient,
      workspaceId,
    );

    if (error) {
      const service = createServiceClientIfConfigured();
      if (service) {
        const fallback = await listAssignableMembers(
          service as unknown as ListAssignableMembersRpcClient,
          workspaceId,
        );
        if (fallback.error) {
          return Response.json(
            { ok: false, errorText: fallback.error.message },
            { status: 502 },
          );
        }
        const members = parseAssignableMembers(fallback.data);
        return Response.json({ ok: true, members, live: true });
      }
      return Response.json({ ok: false, errorText: error.message }, { status: 502 });
    }

    const members = parseAssignableMembers(data);
    return Response.json({ ok: true, members, live: true });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        errorText: err instanceof Error ? err.message : 'Failed to load members',
      },
      { status: 500 },
    );
  }
}
