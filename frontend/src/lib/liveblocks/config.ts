/** Liveblocks configuration — keys referenced by NAME only per STUDY-013 secrets policy. */

import {
  buildEpicRoomId,
  buildStoryRoomId,
  buildBoardRoomId,
  buildWorkspaceLobbyRoomId,
  parseRoomId,
  isPresenceOnlyRoom,
} from '@landi-flow/collaboration';

export {
  buildEpicRoomId,
  buildStoryRoomId,
  buildBoardRoomId,
  buildWorkspaceLobbyRoomId,
  parseRoomId,
  isPresenceOnlyRoom,
};

export function getLiveblocksPublicKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
  if (!key || key.trim().length === 0) {
    return undefined;
  }
  return key.trim();
}

export function isLiveblocksConfigured(): boolean {
  return Boolean(getLiveblocksPublicKey());
}

export function buildEntityRoomId(
  workspaceId: string,
  entityType: 'epic' | 'story',
  entityId: string
): string {
  return entityType === 'story'
    ? buildStoryRoomId(workspaceId, entityId)
    : buildEpicRoomId(workspaceId, entityId);
}
