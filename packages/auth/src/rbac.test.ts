import { describe, expect, it } from 'vitest';
import {
  hasMinWorkspaceRole,
  isWorkspaceAdminRole,
  workspaceRoleRank,
} from './rbac';

describe('workspaceRoleRank', () => {
  it('orders owner above admin above member above guest', () => {
    expect(workspaceRoleRank('owner')).toBeGreaterThan(workspaceRoleRank('admin'));
    expect(workspaceRoleRank('admin')).toBeGreaterThan(workspaceRoleRank('member'));
    expect(workspaceRoleRank('member')).toBeGreaterThan(workspaceRoleRank('guest'));
    expect(workspaceRoleRank('team_owner')).toBeGreaterThan(workspaceRoleRank('member'));
  });
});

describe('hasMinWorkspaceRole', () => {
  it('returns true when actual meets minimum', () => {
    expect(hasMinWorkspaceRole('admin', 'member')).toBe(true);
    expect(hasMinWorkspaceRole('member', 'admin')).toBe(false);
    expect(hasMinWorkspaceRole('owner', 'owner')).toBe(true);
  });
});

describe('isWorkspaceAdminRole', () => {
  it('treats admin and owner as admin roles', () => {
    expect(isWorkspaceAdminRole('admin')).toBe(true);
    expect(isWorkspaceAdminRole('owner')).toBe(true);
    expect(isWorkspaceAdminRole('member')).toBe(false);
    expect(isWorkspaceAdminRole('guest')).toBe(false);
  });
});
