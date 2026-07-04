'use client';

import * as React from 'react';
import type { Story } from '@landi-flow/core/types';
import { hydrateStoryRoom } from '@landi-flow/collaboration';
import { LiveObject } from '@liveblocks/client';
import type { JsonObject } from '@liveblocks/client';
import {
  useMutation,
  useStorage,
  useSelf,
  useOthers,
} from '@liveblocks/react/suspense';
import { Input, cn } from '@landi-flow/ui';
import { CollaborativeRoom } from './collaboration-provider';
import { CursorOverlay, PresenceAvatars } from './presence-cursors';
import { CollaborativeComments } from './collaborative-comments';

export interface CollaborativeStoryPanelProps {
  story: Story;
  className?: string;
}

/** Story detail with live fields, cursors, and comment threads. */
export function CollaborativeStoryPanel({
  story,
  className,
}: CollaborativeStoryPanelProps): React.ReactElement {
  const hydrated = React.useMemo(() => hydrateStoryRoom(story), [story]);

  return (
    <CollaborativeRoom
      roomId={hydrated.roomId}
      initialStorage={hydrated.initialStorage as unknown as JsonObject}
    >
      <StoryPanelInner story={story} className={className} />
    </CollaborativeRoom>
  );
}

interface StoryPanelInnerProps {
  story: Story;
  className?: string;
}

function StoryPanelInner({ story, className }: StoryPanelInnerProps): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const fields = useStorage((root) => {
    const raw = root.fields;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return null;
    }
    return raw as { title?: string };
  });

  const updateTitle = useMutation(({ storage }, title: string) => {
    const fieldsObj = storage.get('fields');
    if (fieldsObj instanceof LiveObject) {
      fieldsObj.set('title', title);
    }
  }, []);

  const self = useSelf();
  const others = useOthers();
  const liveTitle = fields?.title ?? story.title;

  return (
    <div
      ref={containerRef}
      className={cn('relative flex flex-col gap-4 p-4', className)}
    >
      <div className="flex items-center justify-between gap-2">
        <PresenceAvatars />
        <span className="text-xs text-muted-foreground">
          {others.length + (self ? 1 : 0)} in room
        </span>
      </div>

      <CursorOverlay containerRef={containerRef} />

      <div>
        <label htmlFor="story-title" className="sr-only">
          Story title
        </label>
        <Input
          id="story-title"
          value={liveTitle}
          onChange={(event) => updateTitle(event.target.value)}
          className="text-lg font-semibold"
          onFocus={() => {
            // presence update handled by parent room
          }}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface-elevated/30 p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-subtle">
          Description
        </p>
        <p className="text-sm text-muted-foreground">
          {story.description_md ?? 'No description — collaborative Yjs editor ships in task-09j.'}
        </p>
      </div>

      <CollaborativeComments entityLabel="Story" />
    </div>
  );
}
