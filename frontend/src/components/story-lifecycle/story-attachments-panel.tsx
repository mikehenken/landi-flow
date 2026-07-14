'use client';

import * as React from 'react';
import type { Story } from '@landi-flow/core/types';
import { Button, cn } from '@landi-flow/ui';
import { Paperclip, Trash2 } from 'lucide-react';
import {
  addStoryAttachment,
  listStoryAttachments,
  removeStoryAttachment,
  type StoryAttachmentMeta,
} from '@/lib/story-lifecycle/story-attachments-store';

export interface StoryAttachmentsPanelProps {
  story: Story;
  className?: string;
}

/** CAP-014: user file attachments with inline preview (local persistence v1). */
export function StoryAttachmentsPanel({
  story,
  className,
}: StoryAttachmentsPanelProps): React.ReactElement {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = React.useState<StoryAttachmentMeta[]>(() =>
    listStoryAttachments(story.id),
  );

  React.useEffect(() => {
    setAttachments(listStoryAttachments(story.id));
  }, [story.id]);

  const handleFiles = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) {
      return;
    }
    const added: StoryAttachmentMeta[] = [];
    for (const file of Array.from(files)) {
      added.push(await addStoryAttachment(story.id, file));
    }
    setAttachments((prev) => [...added, ...prev]);
  };

  const handleRemove = (attachmentId: string): void => {
    removeStoryAttachment(story.id, attachmentId);
    setAttachments((prev) => prev.filter((entry) => entry.id !== attachmentId));
  };

  return (
    <section
      className={cn('space-y-3', className)}
      data-testid="story-attachments-panel"
      data-cap="CAP-014"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">
            Attachments
          </h3>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          data-testid="story-attachment-upload"
        >
          Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          multiple
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-3 rounded-md border border-border bg-surface-elevated/20 px-3 py-2"
              data-testid="story-attachment-item"
            >
              {attachment.preview_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachment.preview_url}
                  alt={attachment.filename}
                  className="h-10 w-10 rounded object-cover"
                />
              ) : (
                <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{attachment.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {(attachment.size_bytes / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove ${attachment.filename}`}
                onClick={() => handleRemove(attachment.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
