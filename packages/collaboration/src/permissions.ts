import type { WorkspaceMemberRole } from '@landi-flow/auth';
import { isWorkspaceAdminRole } from '@landi-flow/auth/rbac';
import type { RoomAccessLevel } from './types.js';

const ADMIN_ROLES: WorkspaceMemberRole[] = ['owner', 'admin', 'team_owner'];

export interface RoomPermissionInput {
  workspaceRole: WorkspaceMemberRole;
  isTeamMember: boolean;
  teamVisibility: 'public' | 'private';
  actorType: 'human' | 'agent' | 'system';
  agentRoomGranted?: boolean;
}

/**
 * Map linear_clone RBAC to Liveblocks room access per task-05d permission matrix.
 */
export function resolveRoomAccess(input: RoomPermissionInput): RoomAccessLevel {
  if (input.actorType === 'agent') {
    return input.agentRoomGranted ? 'room:write' : 'denied';
  }

  if (input.workspaceRole === 'guest' && !input.isTeamMember) {
    return 'denied';
  }

  if (ADMIN_ROLES.includes(input.workspaceRole) || input.isTeamMember) {
    return 'room:write';
  }

  if (input.teamVisibility === 'public') {
    return 'room:read';
  }

  return 'denied';
}

export function roomAccessToLiveblocksGrants(
  access: RoomAccessLevel
): readonly ('room:write' | 'room:read')[] {
  switch (access) {
    case 'room:write':
      return ['room:write'];
    case 'room:read':
      return ['room:read'];
    case 'denied':
      return [];
  }
}

export function canWriteStructuredFields(access: RoomAccessLevel): boolean {
  return access === 'room:write';
}

export function isAdminRole(role: WorkspaceMemberRole): boolean {
  return isWorkspaceAdminRole(role);
}
