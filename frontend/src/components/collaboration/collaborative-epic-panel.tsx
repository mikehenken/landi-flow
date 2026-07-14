'use client';

import * as React from 'react';
import type { Epic, Story } from '@landi-flow/core/types';
import { hydrateEpicRoom } from '@landi-flow/collaboration';
import { LiveObject } from '@liveblocks/client';
import type { JsonObject } from '@liveblocks/client';
import {
  useMutation,
  useStorage,
  useSelf,
  useOthers,
} from '@liveblocks/react/suspense';
import { Input, EpicBadge, cn } from '@landi-flow/ui';
import { isMockAuthEnabled } from '@/lib/api/config';
import { isLiveblocksConfigured } from '@/lib/liveblocks/config';
import { getEpicStatusCategory } from '@/lib/epic-status';
import { isWorkspaceUuid } from '@/lib/workspace/is-workspace-uuid';
import { CollaborativeRoom } from './collaboration-provider';
import { CursorOverlay, PresenceAvatars } from './presence-cursors';
import { CollaborativeComments } from './collaborative-comments';

export interface CollaborativeEpicPanelProps {
  epic: Epic;
  epicStories: Story[];
  children?: React.ReactNode;
  className?: string;
}

/** Epic detail shell with live summary fields, cursors, and comment threads. */
export function CollaborativeEpicPanel({
  epic,
  epicStories,
  children,
  className,
}: CollaborativeEpicPanelProps): React.ReactElement {
  const liveblocksReady =
    isLiveblocksConfigured() &&
    !isMockAuthEnabled() &&
    isWorkspaceUuid(epic.workspace_id);
  const storyOrder = React.useMemo(
    () => epicStories.map((story) => story.id),
    [epicStories],
  );
  const hydrated = React.useMemo(
    () => (liveblocksReady ? hydrateEpicRoom(epic, storyOrder) : null),
    [liveblocksReady, epic, storyOrder],
  );

  if (!liveblocksReady || hydrated === null) {
    return (
      <div className={cn('relative flex flex-col gap-4', className)}>
        <EpicBadge
          name={epic.name}
          status={getEpicStatusCategory(epic)}
          showLabel
        />
        {children}
        <p className="text-xs text-muted-foreground">
          Collaboration offline — configure Liveblocks to enable live cursors and comments.
        </p>
      </div>
    );
  }

  return (
    <CollaborativeRoom
      roomId={hydrated.roomId}
      initialStorage={hydrated.initialStorage as unknown as JsonObject}
    >
      <EpicPanelInner epic={epic} className={className}>
        {children}
      </EpicPanelInner>
    </CollaborativeRoom>
  );
}

interface EpicPanelInnerProps {
  epic: Epic;
  children?: React.ReactNode;
  className?: string;
}

function EpicPanelInner({
  epic,
  children,
  className,
}: EpicPanelInnerProps): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const summary = useStorage((root) => {
    const raw = root.summary;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return null;
    }
    return raw as { name?: string };
  });

  const updateName = useMutation(({ storage }, name: string) => {
    const summaryObj = storage.get('summary');
    if (summaryObj instanceof LiveObject) {
      summaryObj.set('name', name);
    }
  }, []);

  const self = useSelf();
  const others = useOthers();
  const liveName = summary?.name ?? epic.name;

  return (
    <div
      ref={containerRef}
      className={cn('relative flex flex-col gap-4', className)}
    >
      <div className="flex items-center justify-between gap-2">
        <PresenceAvatars />
        <span className="text-xs text-muted-foreground">
          {others.length + (self ? 1 : 0)} in room
        </span>
      </div>

      <CursorOverlay containerRef={containerRef} />

      <div>
        <label htmlFor="epic-name" className="sr-only">
          Epic name
        </label>
        <Input
          id="epic-name"
          value={liveName}
          onChange={(event) => updateName(event.target.value)}
          className="text-lg font-semibold"
        />
      </div>

      {children}

      <CollaborativeComments entityLabel="Epic" />
    </div>
  );
}
