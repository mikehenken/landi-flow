import type { DbClient } from './db.js';

const ADMIN_ROLES = new Set(['owner', 'admin', 'team_owner']);

export class AuthorizationError extends Error {
  readonly status = 403;

  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export async function assertWorkspaceMember(
  db: DbClient,
  userId: string,
  workspaceId: string
): Promise<void> {
  const { data, error } = await db
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    throw new Error(`Authorization check failed: ${error.message}`);
  }

  if (!data) {
    throw new AuthorizationError('Forbidden: not a workspace member');
  }
}

export async function assertWorkspaceAdmin(
  db: DbClient,
  userId: string,
  workspaceId: string
): Promise<void> {
  const { data, error } = await db
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    throw new Error(`Authorization check failed: ${error.message}`);
  }

  if (!data || !ADMIN_ROLES.has(data.role as string)) {
    throw new AuthorizationError('Forbidden: workspace admin required');
  }
}

export async function assertTeamWriteAccess(
  db: DbClient,
  userId: string,
  workspaceId: string,
  teamId: string
): Promise<void> {
  const { data: teamMember, error: teamError } = await db
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (teamError) {
    throw new Error(`Authorization check failed: ${teamError.message}`);
  }

  if (teamMember) {
    return;
  }

  const { data: wsMember, error: wsError } = await db
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (wsError) {
    throw new Error(`Authorization check failed: ${wsError.message}`);
  }

  if (wsMember && ADMIN_ROLES.has(wsMember.role as string)) {
    return;
  }

  throw new AuthorizationError('Forbidden: team write access required');
}

export async function assertTeamReadable(
  db: DbClient,
  userId: string,
  workspaceId: string,
  teamId: string
): Promise<void> {
  await assertWorkspaceMember(db, userId, workspaceId);

  const { data: team, error: teamError } = await db
    .from('teams')
    .select('visibility')
    .eq('id', teamId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (teamError || !team) {
    throw new AuthorizationError('Forbidden: team not found in workspace');
  }

  if (team.visibility === 'public') {
    return;
  }

  await assertTeamWriteAccess(db, userId, workspaceId, teamId);
}

export function isAuthorizationError(err: unknown): err is AuthorizationError {
  return err instanceof AuthorizationError;
}
