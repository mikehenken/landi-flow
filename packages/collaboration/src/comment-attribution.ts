/** Maps Liveblocks comment author ids to linear_clone.comments attribution columns. */

export type CommentActorType = 'human' | 'agent' | 'system';

export interface CommentAttribution {
  actor_type: CommentActorType;
  author_user_id: string | null;
  author_agent_id: string | null;
  on_behalf_of_user_id: string | null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Derive comment attribution from a Liveblocks `createdBy` user id and optional
 * thread/comment metadata (e.g. proxy comments set `on_behalf_of_user_id` in metadata).
 */
export function deriveCommentAttribution(
  createdBy: string | undefined,
  metadata?: Record<string, unknown> | null
): CommentAttribution {
  const onBehalfRaw = metadata?.on_behalf_of_user_id;
  const onBehalfOfUserId =
    typeof onBehalfRaw === 'string' && isUuid(onBehalfRaw) ? onBehalfRaw : null;

  if (!createdBy) {
    return {
      actor_type: 'human',
      author_user_id: null,
      author_agent_id: null,
      on_behalf_of_user_id: onBehalfOfUserId,
    };
  }

  if (createdBy.startsWith('agent:')) {
    const agentId = createdBy.slice('agent:'.length);
    return {
      actor_type: 'agent',
      author_user_id: null,
      author_agent_id: agentId.length > 0 ? agentId : null,
      on_behalf_of_user_id: onBehalfOfUserId,
    };
  }

  if (createdBy.startsWith('system:')) {
    return {
      actor_type: 'system',
      author_user_id: null,
      author_agent_id: null,
      on_behalf_of_user_id: onBehalfOfUserId,
    };
  }

  if (isUuid(createdBy)) {
    return {
      actor_type: 'human',
      author_user_id: createdBy,
      author_agent_id: null,
      on_behalf_of_user_id: onBehalfOfUserId,
    };
  }

  return {
    actor_type: 'human',
    author_user_id: null,
    author_agent_id: null,
    on_behalf_of_user_id: onBehalfOfUserId,
  };
}
