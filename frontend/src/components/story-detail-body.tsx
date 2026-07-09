'use client';

import * as React from 'react';
import type { Story } from '@landi-flow/core/types';
import { hydrateStoryRoom } from '@landi-flow/collaboration';
import type { JsonObject } from '@liveblocks/client';
import { MessageSquare, Paperclip } from 'lucide-react';
import { cn } from '@landi-flow/ui';
import { ArtifactPanel, ArtifactUploadTrigger } from '@/components/artifacts/artifact-panel';
import { UnifiedCommentsPanel } from '@/components/comments/unified-comments-panel';
import { StoryDetailSection } from '@/components/story-detail-section';
import { StoryDetailSectionScroller } from '@/components/story-detail-section-scroller';
import { StoryMainContent } from '@/components/story-main-content';
import { StoryModalMetadataPanel } from '@/components/story-metadata-sidebar';
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
  /** Pin / expand / close controls rendered in the metadata sidebar header. */
  headerActions?: React.ReactNode;
}

/**
 * Story detail split layout: left main content (~75%) + right metadata sidebar (~25%).
 * Unified scroll — both columns scroll together inside one overflow container.
 */
export function StoryDetailBody({
  story,
  className,
  headerActions,
}: StoryDetailBodyProps): React.ReactElement {
  const [artifactRevision, setArtifactRevision] = React.useState(0);
  const liveblocksReady = isLiveblocksConfigured() && !isMockAuthEnabled();
  const hydrated = React.useMemo(
    () => (liveblocksReady ? hydrateStoryRoom(story) : null),
    [liveblocksReady, story],
  );

  const commentsSection = liveblocksReady && hydrated !== null ? (
    <CollaborativeRoom
      roomId={hydrated.roomId}
      initialStorage={hydrated.initialStorage as unknown as JsonObject}
      fallback={
        <StoryDetailSection
          title="Comments"
          icon={<MessageSquare className="h-4 w-4" />}
          sectionId="comments"
          testId="story-detail-comments-section"
        >
          <p className="text-xs text-muted-foreground">
            Collaboration unavailable — comments remain available offline below.
          </p>
          <UnifiedCommentsPanel storyId={story.id} showTitle={false} />
        </StoryDetailSection>
      }
    >
      <StoryDetailSection
        title="Comments"
        icon={<MessageSquare className="h-4 w-4" />}
        sectionId="comments"
        actions={<PresenceAvatars />}
        testId="story-detail-comments-section"
      >
        <CollaborativeComments
          entityLabel="Story"
          showTitle={false}
          placeholder="Add a comment…"
        />
      </StoryDetailSection>
    </CollaborativeRoom>
  ) : (
    <StoryDetailSection
      title="Comments"
      icon={<MessageSquare className="h-4 w-4" />}
      sectionId="comments"
      testId="story-detail-comments-section"
    >
      <UnifiedCommentsPanel storyId={story.id} showTitle={false} />
    </StoryDetailSection>
  );

  return (
    <div
      className={cn('flex h-full min-h-0 flex-col', className)}
      data-testid="story-detail-body"
    >
      <div className="min-h-0 flex-1 overflow-y-auto" data-testid="story-detail-unified-scroll">
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
          <div className="min-w-0 px-6 py-5" data-testid="story-detail-main-scroll">
            <StoryDetailSectionScroller scrollRootTestId="story-detail-unified-scroll" />
            <div className="space-y-8">
              <StoryMainContent story={story} unifiedScroll />
              <StoryDetailSection
                title="Artifacts"
                icon={<Paperclip className="h-4 w-4" />}
                sectionId="artifacts"
                testId="story-detail-artifacts-panel"
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
              {commentsSection}
            </div>
          </div>

          <div className="min-w-0 border-l border-border/60 bg-surface/30 px-4 py-5">
            <StoryModalMetadataPanel
              story={story}
              headerActions={headerActions}
              unifiedScroll
            />
          </div>
        </div>
      </div>
    </div>
  );
}
