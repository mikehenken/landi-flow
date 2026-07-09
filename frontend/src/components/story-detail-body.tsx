'use client';

import * as React from 'react';
import type { Story } from '@landi-flow/core/types';
import { hydrateStoryRoom } from '@landi-flow/collaboration';
import type { JsonObject } from '@liveblocks/client';
import { Paperclip } from 'lucide-react';
import { cn } from '@landi-flow/ui';
import { ArtifactPanel, ArtifactUploadTrigger } from '@/components/artifacts/artifact-panel';
import { UnifiedCommentsPanel } from '@/components/comments/unified-comments-panel';
import { StoryInspector } from '@/components/story-inspector';
import { StoryDetailSection } from '@/components/story-detail-section';
import { StoryDetailSectionScroller } from '@/components/story-detail-section-scroller';
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

/** Story detail content: properties inspector, artifacts, and a single comments surface. */
export function StoryDetailBody({
  story,
  className,
}: StoryDetailBodyProps): React.ReactElement {
  const [artifactRevision, setArtifactRevision] = React.useState(0);
  const liveblocksReady = isLiveblocksConfigured() && !isMockAuthEnabled();
  const hydrated = React.useMemo(
    () => (liveblocksReady ? hydrateStoryRoom(story) : null),
    [liveblocksReady, story],
  );

  return (
    <div className={cn('space-y-6 p-4', className)} data-testid="story-detail-body">
      <StoryDetailSectionScroller />
      <StoryInspector story={story} layout="detail" />

      <StoryDetailSection
        title="Artifacts"
        icon={<Paperclip className="h-4 w-4" />}
        sectionId="artifacts"
        testId="story-detail-artifacts-section"
        actions={
          <ArtifactUploadTrigger
            storyId={story.id}
            onUploaded={() => setArtifactRevision((value) => value + 1)}
          />
        }
      >
        <ArtifactPanel
          key={artifactRevision}
          storyId={story.id}
          showTitle={false}
          showUpload={false}
        />
      </StoryDetailSection>

      {liveblocksReady && hydrated !== null ? (
        <CollaborativeRoom
          roomId={hydrated.roomId}
          initialStorage={hydrated.initialStorage as unknown as JsonObject}
          fallback={
            <StoryDetailSection title="Comments" sectionId="comments" testId="story-detail-comments-section">
              <p className="text-xs text-muted-foreground">
                Collaboration unavailable — comments remain available offline below.
              </p>
              <UnifiedCommentsPanel storyId={story.id} showTitle={false} />
            </StoryDetailSection>
          }
        >
          <StoryDetailSection
            title="Comments"
            sectionId="comments"
            actions={<PresenceAvatars />}
            testId="story-detail-comments-section"
          >
            <CollaborativeComments entityLabel="Story" showTitle={false} />
          </StoryDetailSection>
        </CollaborativeRoom>
      ) : (
        <StoryDetailSection title="Comments" sectionId="comments" testId="story-detail-comments-section">
          <UnifiedCommentsPanel storyId={story.id} showTitle={false} />
        </StoryDetailSection>
      )}
    </div>
  );
}
