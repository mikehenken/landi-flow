import type { DbClient } from '../lib/db.js';
import { correlationFromRequest, errorResponse, jsonResponse } from '../lib/http.js';
import type { ApiWorkerEnv } from '../middleware/auth.js';
import { parseRoomId, deriveCommentAttribution } from '@landi-flow/collaboration';
import { ENTITY_TOPICS } from '@landi-flow/core/events';
import {
  buildMutationPayload,
  executeTransactionalMutation,
} from '../lib/transactional-mutation.js';
import { getLiveblocksClient } from '../lib/liveblocks-client.js';

import { WebhookHandler } from '@liveblocks/node';
import type { WebhookEvent } from '@liveblocks/node';

export async function handleLiveblocksInboundWebhook(
  request: Request,
  env: ApiWorkerEnv
): Promise<Response> {
  const correlation = correlationFromRequest(request);
  const correlationId = correlation.correlation_id;

  const webhookSecret = env.LIVEBLOCKS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return errorResponse(
      'liveblocks_not_configured',
      'LIVEBLOCKS_WEBHOOK_SECRET is not configured',
      503,
      correlationId
    );
  }

  const liveblocks = getLiveblocksClient(env);
  if (!liveblocks) {
    return errorResponse(
      'liveblocks_not_configured',
      'LIVEBLOCKS_SECRET_KEY is not configured',
      503,
      correlationId
    );
  }

  const rawBody = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  let event: WebhookEvent;
  try {
    const webhookHandler = new WebhookHandler(webhookSecret);
    event = webhookHandler.verifyRequest({
      headers,
      rawBody,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook verification failed';
    return errorResponse('invalid_signature', message, 400, correlationId);
  }

  const roomId =
    event.type === 'storageUpdated' ||
    event.type === 'ydocUpdated' ||
    event.type === 'commentCreated' ||
    event.type === 'threadCreated'
      ? event.data.roomId
      : undefined;
  if (!roomId) {
    return jsonResponse({ ok: true, skipped: 'no_room_id' }, 200, correlationId);
  }

  const parsed = parseRoomId(roomId);
  if (!parsed || parsed.entityType === 'workspace') {
    return jsonResponse({ ok: true, skipped: 'presence_only_room' }, 200, correlationId);
  }

  const { createDbClient } = await import('../lib/db.js');
  const db = createDbClient(env);

  try {
    switch (event.type) {
      case 'storageUpdated':
        await persistStorageSnapshot(db, env, roomId, parsed, correlationId);
        break;
      case 'ydocUpdated':
        await persistYdocSnapshot(env, roomId, parsed.entityType, correlationId);
        break;
      case 'commentCreated':
      case 'threadCreated':
        await mirrorCommentWebhook(db, event, parsed, correlationId);
        break;
      default:
        break;
    }

    return jsonResponse({ ok: true, event: event.type, roomId }, 200, correlationId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Persistence failed';
    return errorResponse('persist_failed', message, 500, correlationId);
  }
}

async function persistStorageSnapshot(
  db: DbClient,
  env: ApiWorkerEnv,
  roomId: string,
  parsed: NonNullable<ReturnType<typeof parseRoomId>>,
  correlationId: string
): Promise<void> {
  const liveblocks = getLiveblocksClient(env);
  if (!liveblocks) {
    return;
  }

  const storage = await liveblocks.getStorageDocument(roomId);
  if (!storage) {
    return;
  }

  if (parsed.entityType === 'story') {
    const fields = (storage as Record<string, unknown>).fields as
      | Record<string, unknown>
      | undefined;
    if (!fields) {
      return;
    }

    const { data: storyRow } = await db
      .from('stories')
      .select('team_id, identifier, workflow_state_id')
      .eq('id', parsed.entityId)
      .eq('workspace_id', parsed.workspaceId)
      .maybeSingle();

    if (!storyRow) {
      return;
    }

    const teamId = storyRow.team_id as string;
    const patch: Record<string, unknown> = { team_id: teamId, story_id: parsed.entityId };
    if (typeof fields.title === 'string') patch.title = fields.title;
    if (typeof fields.statusId === 'string') patch.workflow_state_id = fields.statusId;
    if (typeof fields.priority === 'string') patch.priority = fields.priority;
    if (fields.assigneeId === null || typeof fields.assigneeId === 'string') {
      patch.assignee_id = fields.assigneeId;
    }
    if (typeof fields.sortOrder === 'number') patch.sort_order = fields.sortOrder;

    const topic =
      typeof fields.statusId === 'string' &&
      fields.statusId !== (storyRow.workflow_state_id as string)
        ? ENTITY_TOPICS.STORY_STATUS_CHANGED
        : ENTITY_TOPICS.STORY_UPDATED;

    await executeTransactionalMutation(db, env, {
      op: 'update_story',
      workspace_id: parsed.workspaceId,
      topic,
      payload: buildMutationPayload(
        parsed.workspaceId,
        topic,
        { story_id: parsed.entityId, source: 'liveblocks_webhook' },
        { correlation_id: correlationId }
      ),
      correlation_id: correlationId,
      params: patch,
    });
  }

  if (parsed.entityType === 'board') {
    const columns = (storage as Record<string, unknown>).columns as
      | Array<{ statusId: string; cards: string[] }>
      | undefined;
    if (!columns) {
      return;
    }

    for (const column of columns) {
      for (let index = 0; index < column.cards.length; index += 1) {
        const storyId = column.cards[index];
        const { data: storyRow } = await db
          .from('stories')
          .select('team_id, workflow_state_id')
          .eq('id', storyId)
          .maybeSingle();

        if (!storyRow) {
          continue;
        }

        const topic =
          column.statusId !== (storyRow.workflow_state_id as string)
            ? ENTITY_TOPICS.STORY_STATUS_CHANGED
            : ENTITY_TOPICS.STORY_UPDATED;

        await executeTransactionalMutation(db, env, {
          op: 'update_story',
          workspace_id: parsed.workspaceId,
          topic,
          payload: buildMutationPayload(
            parsed.workspaceId,
            topic,
            { story_id: storyId, source: 'liveblocks_board_webhook' },
            { correlation_id: correlationId }
          ),
          correlation_id: correlationId,
          params: {
            team_id: storyRow.team_id as string,
            story_id: storyId,
            workflow_state_id: column.statusId,
            sort_order: index,
          },
        });
      }
    }
  }
}

async function persistYdocSnapshot(
  _env: ApiWorkerEnv,
  _roomId: string,
  _entityType: string,
  _correlationId: string
): Promise<void> {
  // Yjs REST pull → linear_clone checkpoint deferred to task-09j editor integration.
}

async function mirrorCommentWebhook(
  db: DbClient,
  event: WebhookEvent,
  parsed: NonNullable<ReturnType<typeof parseRoomId>>,
  correlationId: string
): Promise<void> {
  if (event.type !== 'commentCreated' && event.type !== 'threadCreated') {
    return;
  }

  const payload = event.data as Record<string, unknown>;
  const bodyText = typeof payload.body === 'string' ? payload.body : '';
  const createdBy =
    typeof payload.createdBy === 'string'
      ? payload.createdBy
      : typeof payload.updatedBy === 'string'
        ? payload.updatedBy
        : undefined;

  const metadata =
    typeof payload.metadata === 'object' && payload.metadata !== null && !Array.isArray(payload.metadata)
      ? (payload.metadata as Record<string, unknown>)
      : null;

  const attribution = deriveCommentAttribution(createdBy, metadata);

  const insert: Record<string, unknown> = {
    workspace_id: parsed.workspaceId,
    body_json: payload.body ?? { version: 1, content: [] },
    body_md: bodyText,
    actor_type: attribution.actor_type,
    author_user_id: attribution.author_user_id,
    author_agent_id: attribution.author_agent_id,
    on_behalf_of_user_id: attribution.on_behalf_of_user_id,
    correlation_id: correlationId,
  };

  if (parsed.entityType === 'story') {
    insert.story_id = parsed.entityId;
  } else if (parsed.entityType === 'epic') {
    insert.epic_id = parsed.entityId;
  }

  await db.from('comments').insert(insert);
}
