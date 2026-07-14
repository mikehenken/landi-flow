import { describe, expect, it } from 'vitest';
import {
  canWriteStructuredFields,
  resolveRoomAccess,
  roomAccessToLiveblocksGrants,
  sessionPermissionsFromGrants,
} from './permissions';

describe('resolveRoomAccess', () => {
  it('denies agents without room grant', () => {
    expect(
      resolveRoomAccess({
        workspaceRole: 'member',
        isTeamMember: true,
        teamVisibility: 'public',
        actorType: 'agent',
        agentRoomGranted: false,
      }),
    ).toBe('denied');
  });

  it('grants agents write when room granted', () => {
    expect(
      resolveRoomAccess({
        workspaceRole: 'member',
        isTeamMember: true,
        teamVisibility: 'public',
        actorType: 'agent',
        agentRoomGranted: true,
      }),
    ).toBe('room:write');
  });

  it('grants team members write access', () => {
    expect(
      resolveRoomAccess({
        workspaceRole: 'member',
        isTeamMember: true,
        teamVisibility: 'private',
        actorType: 'human',
      }),
    ).toBe('room:write');
  });

  it('grants read on public teams for non-members', () => {
    expect(
      resolveRoomAccess({
        workspaceRole: 'member',
        isTeamMember: false,
        teamVisibility: 'public',
        actorType: 'human',
      }),
    ).toBe('room:read');
  });

  it('denies guests outside team', () => {
    expect(
      resolveRoomAccess({
        workspaceRole: 'guest',
        isTeamMember: false,
        teamVisibility: 'public',
        actorType: 'human',
      }),
    ).toBe('denied');
  });
});

describe('roomAccessToLiveblocksGrants', () => {
  it('maps access levels to Liveblocks grants', () => {
    expect(roomAccessToLiveblocksGrants('room:write')).toEqual(['room:write']);
    expect(roomAccessToLiveblocksGrants('room:read')).toEqual(['room:read']);
    expect(roomAccessToLiveblocksGrants('denied')).toEqual([]);
  });
});

describe('sessionPermissionsFromGrants', () => {
  it('maps write grants to room and comment write', () => {
    expect(sessionPermissionsFromGrants(['room:write'])).toEqual([
      'room:write',
      'comments:write',
    ]);
  });

  it('maps read grants to presence and comment read', () => {
    expect(sessionPermissionsFromGrants(['room:read'])).toEqual([
      'room:read',
      'room:presence:write',
      'comments:read',
    ]);
  });

  it('returns empty for no grants', () => {
    expect(sessionPermissionsFromGrants([])).toEqual([]);
  });
});

describe('canWriteStructuredFields', () => {
  it('requires room:write', () => {
    expect(canWriteStructuredFields('room:write')).toBe(true);
    expect(canWriteStructuredFields('room:read')).toBe(false);
  });
});
