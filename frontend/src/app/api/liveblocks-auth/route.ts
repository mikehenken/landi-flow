import { createClient } from '@/lib/supabase/server';
import { createServiceClientIfConfigured } from '@/lib/supabase/server';
import { createCorrelationContext } from '@/lib/correlation';
import {
  parseRoomId,
  resolveRoomAccess,
  roomAccessToLiveblocksGrants,
} from '@landi-flow/collaboration';
import type { WorkspaceMemberRole } from '@landi-flow/auth';
import { Liveblocks } from '@liveblocks/node';
import { NextResponse } from 'next/server';

interface LiveblocksAuthBody {
  room?: string;
}

interface WorkspaceMemberRow {
  role: WorkspaceMemberRole;
  status: string;
}

interface ProfileRow {
  display_name: string;
  avatar_url: string | null;
}

function errorJson(
  code: string,
  message: string,
  status: number,
  correlationId: string
): NextResponse {
  return NextResponse.json(
    { error: { code, message, correlation_id: correlationId } },
    { status, headers: { 'X-Landi-Correlation-Id': correlationId } }
  );
}

function grantsToPermissions(grants: readonly ('room:write' | 'room:read')[]): string[] {
  if (grants.includes('room:write')) {
    return ['room:write', 'comments:write'];
  }
  return ['room:read', 'room:presence:write', 'comments:read'];
}

/**
 * Liveblocks auth — Supabase session + workspace RBAC per task-05d.
 * Uses access-token session with per-room allow (ID-token room ACL also synced).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const { correlation_id: correlationId } = createCorrelationContext();

  const secretKey = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secretKey) {
    return errorJson(
      'liveblocks_not_configured',
      'LIVEBLOCKS_SECRET_KEY is not configured',
      503,
      correlationId
    );
  }

  let body: LiveblocksAuthBody;
  try {
    body = (await request.json()) as LiveblocksAuthBody;
  } catch {
    return errorJson('invalid_body', 'Request body must be JSON', 400, correlationId);
  }

  const room = body.room;
  if (!room || typeof room !== 'string') {
    return errorJson('missing_room', 'room is required', 400, correlationId);
  }

  const parsed = parseRoomId(room);
  if (!parsed) {
    return errorJson('invalid_room', 'Room ID does not match linear_clone grammar', 400, correlationId);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorJson('unauthorized', 'Supabase session required', 401, correlationId);
  }

  const serviceClient = createServiceClientIfConfigured();
  if (!serviceClient) {
    return errorJson('service_unavailable', 'Service role not configured', 503, correlationId);
  }

  const { data: membershipRaw, error: memberError } = await serviceClient
    .from('workspace_members')
    .select('role, status')
    .eq('workspace_id', parsed.workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (memberError) {
    return errorJson('auth_check_failed', memberError.message, 500, correlationId);
  }

  const membership = membershipRaw as WorkspaceMemberRow | null;
  if (!membership || membership.status !== 'active') {
    return errorJson('forbidden', 'Not an active workspace member', 403, correlationId);
  }

  const workspaceRole = membership.role;

  let teamId: string | null = null;
  let teamVisibility: 'public' | 'private' = 'public';
  let isTeamMember = false;

  if (parsed.entityType === 'story') {
    const { data: story } = await serviceClient
      .from('stories')
      .select('team_id')
      .eq('id', parsed.entityId)
      .eq('workspace_id', parsed.workspaceId)
      .maybeSingle();
    teamId = (story as { team_id: string } | null)?.team_id ?? null;
  } else if (parsed.entityType === 'board') {
    teamId = parsed.entityId;
  } else if (parsed.entityType === 'epic') {
    const { data: epicTeams } = await serviceClient
      .from('epic_teams')
      .select('team_id')
      .eq('epic_id', parsed.entityId)
      .limit(1);
    teamId = (epicTeams as Array<{ team_id: string }> | null)?.[0]?.team_id ?? null;
  }

  if (teamId) {
    const { data: team } = await serviceClient
      .from('teams')
      .select('visibility')
      .eq('id', teamId)
      .maybeSingle();
    teamVisibility = ((team as { visibility: string } | null)?.visibility as 'public' | 'private') ?? 'public';

    const { data: teamMember } = await serviceClient
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    isTeamMember = Boolean(teamMember);
  }

  const access = resolveRoomAccess({
    workspaceRole,
    isTeamMember,
    teamVisibility,
    actorType: 'human',
  });

  const grants = roomAccessToLiveblocksGrants(access);
  if (grants.length === 0) {
    return errorJson('forbidden', 'Room access denied by RBAC', 403, correlationId);
  }

  const { data: profileRaw } = await serviceClient
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle();

  const profile = profileRaw as ProfileRow | null;
  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'User';
  const avatarUrl = profile?.avatar_url ?? '';

  const liveblocks = new Liveblocks({ secret: secretKey });

  await liveblocks.getOrCreateRoom(room, {
    defaultAccesses: [],
    usersAccesses: {
      [user.id]: [...grants],
    },
    metadata: {
      entityType: parsed.entityType,
      workspaceId: parsed.workspaceId,
      correlationId,
    },
  });

  const session = liveblocks.prepareSession(
    user.id,
    {
      userInfo: {
        id: user.id,
        name: displayName,
        avatarUrl,
        actorType: 'human',
      },
    }
  );

  session.allow(room, grantsToPermissions(grants) as ['room:write', 'comments:write']);

  const { body: authBody, status } = await session.authorize();

  return new NextResponse(authBody, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Landi-Correlation-Id': correlationId,
    },
  });
}
