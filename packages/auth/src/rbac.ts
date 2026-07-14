import type { WorkspaceMemberRole } from './types.js';

/**
 * Privilege rank for workspace roles — mirrors linear_clone.workspace_role_rank() in Postgres.
 * Enum declaration order (owner first) does NOT match privilege rank.
 */
const WORKSPACE_ROLE_RANK: Record<WorkspaceMemberRole, number> = {
  guest: 0,
  member: 1,
  team_owner: 2,
  admin: 3,
  owner: 4,
};

export function workspaceRoleRank(role: WorkspaceMemberRole): number {
  return WORKSPACE_ROLE_RANK[role];
}

export function hasMinWorkspaceRole(
  actual: WorkspaceMemberRole,
  minimum: WorkspaceMemberRole
): boolean {
  return workspaceRoleRank(actual) >= workspaceRoleRank(minimum);
}

export function isWorkspaceAdminRole(role: WorkspaceMemberRole): boolean {
  return hasMinWorkspaceRole(role, 'admin');
}
