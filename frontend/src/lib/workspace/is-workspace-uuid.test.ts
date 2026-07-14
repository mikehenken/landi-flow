import { describe, expect, it } from 'vitest';
import { DEMO_WORKSPACE_ID } from '@/lib/seed-data';
import { isWorkspaceUuid } from './is-workspace-uuid';
import { assertLiveblocksRoomWorkspaceUuid } from './liveblocks-room-workspace';

describe('isWorkspaceUuid', () => {
  it('accepts resolved Postgres uuids', () => {
    expect(isWorkspaceUuid('d36ba4c7-f4a1-4fa9-a5e4-3ea5588060c2')).toBe(true);
  });

  it('rejects demo / host-derived workspace ids', () => {
    expect(isWorkspaceUuid(DEMO_WORKSPACE_ID)).toBe(false);
    expect(isWorkspaceUuid('ws-landi-flow-demo')).toBe(false);
    expect(isWorkspaceUuid(null)).toBe(false);
    expect(isWorkspaceUuid(undefined)).toBe(false);
    expect(isWorkspaceUuid('')).toBe(false);
  });
});

describe('assertLiveblocksRoomWorkspaceUuid', () => {
  it('rejects rooms built with the demo workspace slug (would 500 on uuid cast)', () => {
    const result = assertLiveblocksRoomWorkspaceUuid(
      `linear_clone:${DEMO_WORKSPACE_ID}:workspace:${DEMO_WORKSPACE_ID}`,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid_workspace_id');
      expect(result.status).toBe(400);
    }
  });

  it('rejects invalid room grammar', () => {
    const result = assertLiveblocksRoomWorkspaceUuid('not-a-room');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid_room');
      expect(result.status).toBe(400);
    }
  });

  it('accepts rooms with a UUID workspace id', () => {
    const workspaceId = 'd36ba4c7-f4a1-4fa9-a5e4-3ea5588060c2';
    const result = assertLiveblocksRoomWorkspaceUuid(
      `linear_clone:${workspaceId}:story:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
    );
    expect(result).toEqual({
      ok: true,
      workspaceId,
      entityType: 'story',
      entityId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
  });
});
