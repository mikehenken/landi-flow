import { LiveObject } from '@liveblocks/node';
import type { LsonObject } from '@liveblocks/node';
import type { DbClient } from './db.js';
import { getLiveblocksClient } from './liveblocks-client.js';
import type { ApiWorkerEnv } from '../middleware/auth.js';
import {
  buildStoryRoomId,
  parseRoomId,
  type StoryFieldsStorage,
} from '@landi-flow/collaboration';
import { ENTITY_TOPICS } from '@landi-flow/core/events';

export interface FanoutResult {
  roomId: string;
  applied: boolean;
  reason?: string;
}

function asLiveObject(value: unknown): LiveObject<LsonObject> | null {
  return value instanceof LiveObject ? value : null;
}

/** Fan-out committed Supabase story changes into open Liveblocks rooms. */
export async function fanOutStoryToRoom(
  env: ApiWorkerEnv,
  _db: DbClient,
  storyId: string,
  _correlationId: string
): Promise<FanoutResult> {
  const liveblocks = getLiveblocksClient(env);
  if (!liveblocks) {
    return { roomId: '', applied: false, reason: 'liveblocks_not_configured' };
  }

  const { data: story, error } = await _db
    .from('stories')
    .select(
      'id, workspace_id, title, workflow_state_id, priority, assignee_id, delegate_agent_id, sort_order'
    )
    .eq('id', storyId)
    .maybeSingle();

  if (error || !story) {
    return { roomId: '', applied: false, reason: 'story_not_found' };
  }

  const workspaceId = story.workspace_id as string;
  const roomId = buildStoryRoomId(workspaceId, story.id as string);

  const fields: StoryFieldsStorage = {
    title: story.title as string,
    statusId: story.workflow_state_id as string,
    priority: story.priority as StoryFieldsStorage['priority'],
    assigneeId: (story.assignee_id as string | null) ?? null,
    delegateAgentId: (story.delegate_agent_id as string | null) ?? null,
    sortOrder: Number(story.sort_order),
  };

  try {
    await liveblocks.mutateStorage(roomId, ({ root }) => {
      const fieldsObj = asLiveObject(root.get('fields'));
      if (!fieldsObj) {
        return;
      }
      fieldsObj.set('title', fields.title);
      fieldsObj.set('statusId', fields.statusId);
      fieldsObj.set('priority', fields.priority);
      fieldsObj.set('assigneeId', fields.assigneeId);
      fieldsObj.set('delegateAgentId', fields.delegateAgentId);
      fieldsObj.set('sortOrder', fields.sortOrder);
    });

    return { roomId, applied: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'mutateStorage failed';
    return { roomId, applied: false, reason: message };
  }
}

export function shouldFanOutTopic(topic: string): boolean {
  return (
    topic === ENTITY_TOPICS.STORY_UPDATED ||
    topic === ENTITY_TOPICS.STORY_STATUS_CHANGED ||
    topic === ENTITY_TOPICS.STORY_CREATED
  );
}

export function extractStoryIdFromPayload(payload: Record<string, unknown>): string | null {
  const storyId = payload.story_id ?? payload.id;
  return typeof storyId === 'string' ? storyId : null;
}

export function extractRoomFromWebhook(roomId: string): ReturnType<typeof parseRoomId> {
  return parseRoomId(roomId);
}
