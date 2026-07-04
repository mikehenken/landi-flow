import type { CollabEntityType } from './types.js';

const ROOM_PREFIX = 'linear_clone';

export interface ParsedRoomId {
  workspaceId: string;
  entityType: CollabEntityType;
  entityId: string;
}

/** Build LRN-style room ID: linear_clone:{workspaceId}:{entityType}:{entityId} */
export function buildRoomId(
  workspaceId: string,
  entityType: CollabEntityType,
  entityId: string
): string {
  return `${ROOM_PREFIX}:${workspaceId}:${entityType}:${entityId}`;
}

export function buildWorkspaceLobbyRoomId(workspaceId: string): string {
  return buildRoomId(workspaceId, 'workspace', workspaceId);
}

export function buildStoryRoomId(workspaceId: string, storyId: string): string {
  return buildRoomId(workspaceId, 'story', storyId);
}

export function buildEpicRoomId(workspaceId: string, epicId: string): string {
  return buildRoomId(workspaceId, 'epic', epicId);
}

export function buildBoardRoomId(workspaceId: string, teamId: string): string {
  return buildRoomId(workspaceId, 'board', teamId);
}

/** Parse room ID; returns null if grammar invalid. */
export function parseRoomId(roomId: string): ParsedRoomId | null {
  const parts = roomId.split(':');
  if (parts.length !== 4 || parts[0] !== ROOM_PREFIX) {
    return null;
  }

  const workspaceId = parts[1];
  const entityTypeRaw = parts[2];
  const entityId = parts[3];

  if (!workspaceId || !entityId) {
    return null;
  }

  const validTypes: CollabEntityType[] = ['workspace', 'epic', 'story', 'board'];
  if (!validTypes.includes(entityTypeRaw as CollabEntityType)) {
    return null;
  }

  return {
    workspaceId,
    entityType: entityTypeRaw as CollabEntityType,
    entityId,
  };
}

/** Wildcard pattern for agent scoped room grants within a workspace. */
export function workspaceRoomWildcard(workspaceId: string): string {
  return `${ROOM_PREFIX}:${workspaceId}:*`;
}

export function isPresenceOnlyRoom(entityType: CollabEntityType): boolean {
  return entityType === 'workspace';
}
