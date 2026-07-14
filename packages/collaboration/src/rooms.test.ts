import { describe, expect, it } from 'vitest';
import {
  buildBoardRoomId,
  buildEpicRoomId,
  buildRoomId,
  buildStoryRoomId,
  buildWorkspaceLobbyRoomId,
  isPresenceOnlyRoom,
  parseRoomId,
  workspaceRoomWildcard,
} from './rooms';

describe('buildRoomId', () => {
  it('uses linear_clone LRN-style grammar', () => {
    expect(buildStoryRoomId('ws-1', 'story-42')).toBe('linear_clone:ws-1:story:story-42');
    expect(buildEpicRoomId('ws-1', 'epic-7')).toBe('linear_clone:ws-1:epic:epic-7');
    expect(buildBoardRoomId('ws-1', 'team-a')).toBe('linear_clone:ws-1:board:team-a');
    expect(buildWorkspaceLobbyRoomId('ws-1')).toBe('linear_clone:ws-1:workspace:ws-1');
  });
});

describe('parseRoomId', () => {
  it('parses valid room ids', () => {
    expect(parseRoomId('linear_clone:ws-1:story:abc')).toEqual({
      workspaceId: 'ws-1',
      entityType: 'story',
      entityId: 'abc',
    });
  });

  it('returns null for invalid grammar', () => {
    expect(parseRoomId('invalid')).toBeNull();
    expect(parseRoomId('linear_clone:ws:unknown:id')).toBeNull();
    expect(parseRoomId('linear_clone::story:id')).toBeNull();
  });

  it('parses demo workspace slug grammar (auth must still UUID-gate separately)', () => {
    const parsed = parseRoomId('linear_clone:ws-landi-flow-demo:workspace:ws-landi-flow-demo');
    expect(parsed).toEqual({
      workspaceId: 'ws-landi-flow-demo',
      entityType: 'workspace',
      entityId: 'ws-landi-flow-demo',
    });
  });
});

describe('workspaceRoomWildcard', () => {
  it('scopes agent grants to workspace', () => {
    expect(workspaceRoomWildcard('ws-99')).toBe('linear_clone:ws-99:*');
  });
});

describe('isPresenceOnlyRoom', () => {
  it('identifies workspace lobby rooms', () => {
    expect(isPresenceOnlyRoom('workspace')).toBe(true);
    expect(isPresenceOnlyRoom('story')).toBe(false);
  });
});

describe('round-trip', () => {
  it('build then parse preserves entity', () => {
    const roomId = buildRoomId('ws-x', 'epic', 'epic-001');
    expect(parseRoomId(roomId)?.entityType).toBe('epic');
  });
});
