'use client';

import * as React from 'react';
import { useThreads, useCreateThread, useCreateComment } from '@liveblocks/react/suspense';
import { Button, Input, cn } from '@landi-flow/ui';
import type { CollabUserMeta } from '@landi-flow/collaboration';

export interface CollaborativeCommentsProps {
  entityLabel?: string;
  className?: string;
  /** When false, parent section supplies the uppercase header. */
  showTitle?: boolean;
}

/** Collaborative comment threads via Liveblocks Comments product. */
export function CollaborativeComments({
  entityLabel = 'Entity',
  className,
  showTitle = true,
}: CollaborativeCommentsProps): React.ReactElement {
  const { threads } = useThreads();
  const createThread = useCreateThread();
  const createComment = useCreateComment();
  const [draft, setDraft] = React.useState('');
  const [replyDrafts, setReplyDrafts] = React.useState<Record<string, string>>({});

  const handleNewThread = (): void => {
    const body = draft.trim();
    if (!body) {
      return;
    }
    createThread({
      body: {
        version: 1,
        content: [{ type: 'paragraph', children: [{ text: body }] }],
      },
      metadata: { entityLabel },
    });
    setDraft('');
  };

  const handleReply = (threadId: string): void => {
    const body = (replyDrafts[threadId] ?? '').trim();
    if (!body) {
      return;
    }
    createComment({
      threadId,
      body: {
        version: 1,
        content: [{ type: 'paragraph', children: [{ text: body }] }],
      },
    });
    setReplyDrafts((prev) => ({ ...prev, [threadId]: '' }));
  };

  return (
    <section className={cn('space-y-3', className)} aria-label="Collaborative comments">
      {showTitle ? <h3 className="text-sm font-semibold text-foreground">Comments</h3> : null}

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Add a comment on this ${entityLabel.toLowerCase()}…`}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleNewThread();
            }
          }}
        />
        <Button type="button" size="sm" onClick={handleNewThread} disabled={!draft.trim()}>
          Post
        </Button>
      </div>

      <ul className="space-y-4">
        {(threads ?? []).map((thread) => {
          const firstComment = thread.comments[0];
          const author = firstComment?.userId ?? 'unknown';
          const text =
            extractPlainText(firstComment?.body) ?? '(empty comment)';

          return (
            <li
              key={thread.id}
              className="rounded-lg border border-border bg-surface-elevated/20 p-3"
            >
              <p className="text-xs text-muted-foreground">Author: {author}</p>
              <p className="mt-1 text-sm text-foreground">{text}</p>

              {thread.comments.slice(1).map((comment) => (
                <div key={comment.id} className="ml-4 mt-2 border-l border-border pl-3">
                  <p className="text-xs text-muted-foreground">{comment.userId}</p>
                  <p className="text-sm">{extractPlainText(comment.body) ?? ''}</p>
                </div>
              ))}

              <div className="mt-2 flex gap-2">
                <Input
                  value={replyDrafts[thread.id] ?? ''}
                  onChange={(event) =>
                    setReplyDrafts((prev) => ({
                      ...prev,
                      [thread.id]: event.target.value,
                    }))
                  }
                  placeholder="Reply…"
                  className="text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleReply(thread.id)}
                >
                  Reply
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {(threads ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet — be the first.</p>
      ) : null}
    </section>
  );
}

function extractPlainText(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const record = body as { content?: Array<{ children?: Array<{ text?: string }> }> };
  const parts: string[] = [];
  for (const block of record.content ?? []) {
    for (const child of block.children ?? []) {
      if (child.text) {
        parts.push(child.text);
      }
    }
  }
  return parts.length > 0 ? parts.join(' ') : null;
}

export type { CollabUserMeta };
