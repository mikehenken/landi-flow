import { describe, expect, it } from 'vitest';
import { isAdminRole, resolveRoomAccess } from './permissions';

describe('permissions edge cases', () => {
  it('denies private team for non-member non-admin', () => {
    expect(
      resolveRoomAccess({
        workspaceRole: 'member',
        isTeamMember: false,
        teamVisibility: 'private',
        actorType: 'human',
      }),
    ).toBe('denied');
  });

  it('isAdminRole delegates to rbac', () => {
    expect(isAdminRole('owner')).toBe(true);
    expect(isAdminRole('guest')).toBe(false);
  });
});
