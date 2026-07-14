import type { ActorType, CommentRecord } from '@landi-flow/core/types';
import { DEMO_WORKSPACE_ID } from '@/lib/seed-data';

export const COMMENTS_STORAGE_KEY = 'landi-flow:unified-comments';

export const SEED_COMMENTS: CommentRecord[] = [
  {
    id: 'comment-human-001',
    workspace_id: DEMO_WORKSPACE_ID,
    story_id: 'story-001',
    epic_id: null,
    body_md: 'Shell looks great — can we default to List + Status grouping?',
    actor_type: 'human',
    author_user_id: 'user-jane',
    author_agent_id: null,
    on_behalf_of_user_id: null,
    parent_id: null,
    correlation_id: null,
    created_at: '2026-07-04T10:00:00.000Z',
  },
  {
    id: 'comment-agent-001',
    workspace_id: DEMO_WORKSPACE_ID,
    story_id: 'story-001',
    epic_id: null,
    body_md: 'Implemented progressive disclosure drawer — advanced filters collapsed by default.',
    actor_type: 'agent',
    author_user_id: null,
    author_agent_id: 'agent-cursor-external',
    on_behalf_of_user_id: null,
    parent_id: null,
    correlation_id: 'corr-comment-agent-001',
    created_at: '2026-07-05T11:00:00.000Z',
  },
  {
    id: 'comment-proxy-001',
    workspace_id: DEMO_WORKSPACE_ID,
    story_id: 'story-001',
    epic_id: null,
    body_md: 'LGTM — ship it after e2e proof.',
    actor_type: 'agent',
    author_user_id: null,
    author_agent_id: 'agent-cursor-external',
    on_behalf_of_user_id: 'user-jane',
    parent_id: 'comment-agent-001',
    correlation_id: 'corr-comment-proxy-001',
    created_at: '2026-07-05T12:00:00.000Z',
  },
  {
    id: 'comment-system-001',
    workspace_id: DEMO_WORKSPACE_ID,
    story_id: 'story-001',
    epic_id: null,
    body_md: 'CI passed — shell-sidebar e2e 4/4.',
    actor_type: 'system',
    author_user_id: null,
    author_agent_id: null,
    on_behalf_of_user_id: null,
    parent_id: null,
    correlation_id: 'corr-comment-system-001',
    created_at: '2026-07-06T08:00:00.000Z',
  },
];

function readComments(): CommentRecord[] {
  if (typeof window === 'undefined') {
    return SEED_COMMENTS;
  }
  try {
    const raw = window.localStorage.getItem(COMMENTS_STORAGE_KEY);
    if (!raw) {
      return SEED_COMMENTS;
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CommentRecord[]) : SEED_COMMENTS;
  } catch {
    return SEED_COMMENTS;
  }
}

export function listCommentsForStory(storyId: string): CommentRecord[] {
  return readComments()
    .filter((row) => row.story_id === storyId && !row.parent_id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function listCommentReplies(parentId: string): CommentRecord[] {
  return readComments()
    .filter((row) => row.parent_id === parentId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function listCommentsForEpic(epicId: string): CommentRecord[] {
  return readComments()
    .filter((row) => row.epic_id === epicId && !row.parent_id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function createComment(input: {
  story_id?: string | null;
  epic_id?: string | null;
  body_md: string;
  actor_type: ActorType;
  author_user_id?: string | null;
  author_agent_id?: string | null;
  on_behalf_of_user_id?: string | null;
  parent_id?: string | null;
}): CommentRecord {
  const comment: CommentRecord = {
    id: `comment-${crypto.randomUUID()}`,
    workspace_id: DEMO_WORKSPACE_ID,
    story_id: input.story_id ?? null,
    epic_id: input.epic_id ?? null,
    body_md: input.body_md,
    actor_type: input.actor_type,
    author_user_id: input.author_user_id ?? null,
    author_agent_id: input.author_agent_id ?? null,
    on_behalf_of_user_id: input.on_behalf_of_user_id ?? null,
    parent_id: input.parent_id ?? null,
    correlation_id: null,
    created_at: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        COMMENTS_STORAGE_KEY,
        JSON.stringify([...readComments(), comment]),
      );
    } catch {
      // ignore
    }
  }
  return comment;
}
