import type { ActorType, Epic, Story, StoryPriority } from '@landi-flow/core/types';

/** Liveblocks entity types per task-05d room grammar. */
export type CollabEntityType = 'workspace' | 'epic' | 'story' | 'board';

/** Presence payload — flat JSON-only fields for Liveblocks validation. */
export interface CollabPresence {
  cursorX: number | null;
  cursorY: number | null;
  selectionFieldId: string | null;
  selectionCardId: string | null;
  editingSurface: string | null;
  editingTarget: string | null;
}

/** Immutable user metadata minted at auth time (JSON-serializable). */
export interface CollabUserMeta {
  id: string;
  name: string;
  avatarUrl: string;
  actorType: 'human' | 'agent';
  agentId: string | null;
}

/** Story room structured fields — maps to linear_clone.stories columns. */
export interface StoryFieldsStorage {
  title: string;
  statusId: string;
  priority: StoryPriority;
  assigneeId: string | null;
  delegateAgentId: string | null;
  sortOrder: number;
}

export interface StoryRoomStorage {
  fields: StoryFieldsStorage;
  labels: string[];
}

export interface EpicSummaryStorage {
  name: string;
  statusId: string;
  priority: StoryPriority;
  leadId: string | null;
  targetDate: string | null;
}

export interface EpicRoomStorage {
  summary: EpicSummaryStorage;
  storyOrder: string[];
}

export interface BoardColumnStorage {
  statusId: string;
  cards: string[];
}

export interface BoardRoomStorage {
  columns: BoardColumnStorage[];
}

export type CollabStorage =
  | { type: 'story'; root: StoryRoomStorage }
  | { type: 'epic'; root: EpicRoomStorage }
  | { type: 'board'; root: BoardRoomStorage }
  | { type: 'workspace'; root: Record<string, never> };

/** Ephemeral broadcast events (toasts, agent typing). */
export type CollabBroadcastEvent =
  | { type: 'agent_typing'; agentId: string; surface: string }
  | { type: 'story_moved'; storyId: string; statusId: string }
  | { type: 'reaction'; emoji: string; targetId: string };

/** Room access level derived from linear_clone RBAC. */
export type RoomAccessLevel = 'room:write' | 'room:read' | 'denied';

export interface RoomAuthContext {
  userId: string;
  workspaceId: string;
  teamIds: string[];
  workspaceRole: string;
  actorType: ActorType;
  agentId?: string;
  displayName: string;
  avatarUrl: string;
}

export interface HydratedStoryRoom {
  roomId: string;
  initialStorage: StoryRoomStorage;
  story: Story;
}

export interface HydratedEpicRoom {
  roomId: string;
  initialStorage: EpicRoomStorage;
  epic: Epic;
}

export interface HydratedBoardRoom {
  roomId: string;
  initialStorage: BoardRoomStorage;
  teamId: string;
}
