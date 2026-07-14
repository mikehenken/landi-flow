import { parseRoomId, type ParsedRoomId } from '@landi-flow/collaboration';
import { isWorkspaceUuid } from './is-workspace-uuid';

export type LiveblocksRoomWorkspaceResult =
  | ({ ok: true } & ParsedRoomId)
  | {
      ok: false;
      code: 'invalid_room' | 'invalid_workspace_id';
      message: string;
      status: 400;
    };

/**
 * Shared gate for Liveblocks auth + client room opens.
 * Demo/host ids such as `ws-landi-flow-demo` must never hit uuid-typed DB columns.
 */
export function assertLiveblocksRoomWorkspaceUuid(
  roomId: string,
): LiveblocksRoomWorkspaceResult {
  const parsed = parseRoomId(roomId);
  if (!parsed) {
    return {
      ok: false,
      code: 'invalid_room',
      message: 'Room ID does not match linear_clone grammar',
      status: 400,
    };
  }

  if (!isWorkspaceUuid(parsed.workspaceId)) {
    return {
      ok: false,
      code: 'invalid_workspace_id',
      message: 'Room workspace id must be a resolved UUID (demo/host ids are not allowed)',
      status: 400,
    };
  }

  return { ok: true, ...parsed };
}
