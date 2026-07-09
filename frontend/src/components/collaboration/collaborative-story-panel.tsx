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
import { isMockAuthEnabled } from '@/lib/api/config';
import { isLiveblocksConfigured } from '@/lib/liveblocks/config';
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
  const liveblocksReady = isLiveblocksConfigured() && !isMockAuthEnabled();
  const hydrated = React.useMemo(
    () => (liveblocksReady ? hydrateStoryRoom(story) : null),
    [liveblocksReady, story],
  );

  if (!liveblocksReady || hydrated === null) {
    return <OfflineStoryPanel story={story} className={className} />;
  }

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

/** Local-only story detail when Liveblocks keys are absent (CI mock auth / E2E). */
function OfflineStoryPanel({ story, className }: StoryPanelInnerProps): React.ReactElement {
  const [title, setTitle] = React.useState(story.title);

  React.useEffect(() => {
    setTitle(story.title);
  }, [story.id, story.title]);

  return (
    <div className={cn('relative flex flex-col gap-4 p-4', className)}>
      <div>
        <label htmlFor="story-title-offline" className="sr-only">
          Story title
        </label>
        <Input
          id="story-title-offline"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="text-lg font-semibold"
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

      <p className="text-xs text-muted-foreground">
        Collaboration offline — configure Liveblocks to enable live cursors and comments.
      </p>
    </div>
  );
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
