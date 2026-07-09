'use client';

import * as React from 'react';
import type { CommentRecord } from '@landi-flow/core/types';
import { Button, Input, cn } from '@landi-flow/ui';
import { CommentAttributionBadge } from '@/components/comments/comment-attribution-badge';
import {
  createComment,
  listCommentReplies,
  listCommentsForEpic,
  listCommentsForStory,
} from '@/lib/comments/unified-comments-store';

export interface UnifiedCommentsPanelProps {
  storyId?: string | null;
  epicId?: string | null;
  className?: string;
  /** When false, parent section supplies the uppercase header. */
  showTitle?: boolean;
}

function authorLabel(comment: CommentRecord): string {
  if (comment.actor_type === 'human' && comment.author_user_id) {
    return comment.author_user_id;
  }
  if (comment.actor_type === 'agent' && comment.author_agent_id) {
    return comment.author_agent_id;
  }
  if (comment.actor_type === 'system') {
    return 'System';
  }
  return 'Unknown';
}

function onBehalfLabel(comment: CommentRecord): string | null {
  return comment.on_behalf_of_user_id ?? null;
}

/** MCP-IDE-002 — unified comment threads with actor_type badges (mock/offline path). */
export function UnifiedCommentsPanel({
  storyId,
  epicId,
  className,
  showTitle = true,
}: UnifiedCommentsPanelProps): React.ReactElement {
  const [comments, setComments] = React.useState<CommentRecord[]>([]);
  const [draft, setDraft] = React.useState('');

  const reload = React.useCallback(() => {
    if (storyId) {
      setComments(listCommentsForStory(storyId));
    } else if (epicId) {
      setComments(listCommentsForEpic(epicId));
    } else {
      setComments([]);
    }
  }, [storyId, epicId]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const handlePost = (): void => {
    const body = draft.trim();
    if (!body) {
      return;
    }
    createComment({
      story_id: storyId ?? null,
      epic_id: epicId ?? null,
      body_md: body,
      actor_type: 'human',
      author_user_id: 'user-jane',
    });
    setDraft('');
    reload();
  };

  return (
    <section
      className={className}
      data-testid="unified-comments-panel"
      aria-label="Comments with attribution"
    >
      {showTitle ? <h3 className="mb-3 text-sm font-semibold">Comments</h3> : null}

      <div className={cn('flex gap-2', showTitle ? 'mb-4' : 'mb-3')}>
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a comment…"
          data-testid="unified-comment-input"
        />
        <Button type="button" size="sm" onClick={handlePost} data-testid="unified-comment-post">
          Post
        </Button>
      </div>

      <ul className="space-y-3">
        {comments.map((comment) => {
          const replies = listCommentReplies(comment.id);
          return (
            <li
              key={comment.id}
              className="rounded-lg border border-border p-3"
              data-testid="unified-comment-thread"
            >
              <CommentAttributionBadge
                actorType={comment.actor_type}
                authorLabel={authorLabel(comment)}
                onBehalfOfLabel={onBehalfLabel(comment)}
              />
              <p className="mt-2 text-sm">{comment.body_md}</p>

              {replies.map((reply) => (
                <div
                  key={reply.id}
                  className="ml-4 mt-2 border-l border-border pl-3"
                  data-testid="unified-comment-reply"
                >
                  <CommentAttributionBadge
                    actorType={reply.actor_type}
                    authorLabel={authorLabel(reply)}
                    onBehalfOfLabel={onBehalfLabel(reply)}
                  />
                  <p className="mt-1 text-sm">{reply.body_md}</p>
                </div>
              ))}
            </li>
          );
        })}
      </ul>

      {comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet.</p>
      ) : null}
    </section>
  );
}
