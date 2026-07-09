'use client';

import * as React from 'react';
import type { Story } from '@landi-flow/core/types';
import { hydrateStoryRoom } from '@landi-flow/collaboration';
import type { JsonObject } from '@liveblocks/client';
import { cn } from '@landi-flow/ui';
import { ArtifactPanel } from '@/components/artifacts/artifact-panel';
import { UnifiedCommentsPanel } from '@/components/comments/unified-comments-panel';
import { StoryInspector } from '@/components/story-inspector';
import {
  CollaborativeComments,
  CollaborativeRoom,
  PresenceAvatars,
} from '@/components/collaboration';
import { isMockAuthEnabled } from '@/lib/api/config';
import { isLiveblocksConfigured } from '@/lib/liveblocks/config';

export interface StoryDetailBodyProps {
  story: Story;
  className?: string;
}

/** Story detail content: properties inspector + optional Liveblocks presence/comments. */
export function StoryDetailBody({
  story,
  className,
}: StoryDetailBodyProps): React.ReactElement {
  const liveblocksReady = isLiveblocksConfigured() && !isMockAuthEnabled();
  const hydrated = React.useMemo(
    () => (liveblocksReady ? hydrateStoryRoom(story) : null),
    [liveblocksReady, story],
  );

  return (
    <div className={cn('flex min-h-0 flex-col', className)} data-testid="story-detail-body">
      <StoryInspector story={story} layout="detail" />
      <div className="shrink-0 space-y-6 border-t border-border px-4 py-4">
        <ArtifactPanel storyId={story.id} />
        <UnifiedCommentsPanel storyId={story.id} />
      </div>
      {liveblocksReady && hydrated !== null ? (
        <CollaborativeRoom
          roomId={hydrated.roomId}
          initialStorage={hydrated.initialStorage as unknown as JsonObject}
          fallback={
            <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              Collaboration unavailable — properties remain editable offline.
            </p>
          }
        >
          <div className="shrink-0 border-t border-border px-4 py-4">
            <div className="mb-3 flex items-center justify-end gap-2">
              <PresenceAvatars />
            </div>
            <CollaborativeComments entityLabel="Story" />
          </div>
        </CollaborativeRoom>
      ) : null}
    </div>
  );
}
