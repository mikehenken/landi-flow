'use client';

import * as React from 'react';
import type { Story } from '@landi-flow/core/types';
import { cn } from '@landi-flow/ui';
import {
  ChevronRight,
  Flag,
  Link2,
  ListChecks,
  Paperclip,
} from 'lucide-react';
import { DescriptionEditor } from '@/components/description-editor';
import { StoryHistoryPanel } from '@/components/story-lifecycle/story-history-panel';
import { StoryRelationsPanel } from '@/components/story-lifecycle/story-relations-panel';
import { StorySignalsPanel } from '@/components/story-lifecycle/story-signals-panel';
import { StoryAttachmentsPanel } from '@/components/story-lifecycle/story-attachments-panel';
import { SubStoriesList } from '@/components/story-lifecycle/sub-story-progress';
import { useEpicStore } from '@/hooks/use-epic-store';
import { useStoryPropertyHandlers } from '@/hooks/use-story-property-handlers';
import { useStoryStore } from '@/hooks/use-story-store';
import { scrollToStoryDetailSection } from '@/lib/story/story-detail-sections';
import { storyStore } from '@/stores/story-store';

/** Matches create-story-modal description field styling (CAP-004 / task-09p). */
const STORY_DESCRIPTION_EDITOR_CLASS =
  'min-h-[120px] rounded-md border border-border/60 bg-white/[0.03] px-3 py-2';

interface AddToStoryChipProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function AddToStoryChip({ icon, label, onClick }: AddToStoryChipProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-white/[0.03]',
        'px-2.5 py-1.5 text-xs text-muted-foreground transition-colors',
        'hover:border-border hover:bg-white/[0.06] hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export interface StoryMainContentProps {
  story: Story;
  className?: string;
  embeddedCollaboration?: boolean;
  /** When true, child panels expand with parent scroll (modal unified scroll). */
  unifiedScroll?: boolean;
}

/** Left main content (~75% width) — description, relations, attachments, activity. */
export function StoryMainContent({
  story,
  className,
  embeddedCollaboration = false,
  unifiedScroll = false,
}: StoryMainContentProps): React.ReactElement {
  const [localHighlightedSignalId, setLocalHighlightedSignalId] = React.useState<string | null>(
    null,
  );
  const { detailFocus } = useStoryStore();
  const highlightedSignalId =
    detailFocus.highlightedSignalId ?? localHighlightedSignalId;
  const { epics } = useEpicStore();
  const epic = epics.find((entry) => entry.id === story.epic_id) ?? null;
  const handlers = useStoryPropertyHandlers(story);

  return (
    <div
      className={cn('space-y-8', className)}
      data-testid="story-detail-main"
    >
      <header className="space-y-3">
        <nav
          className="flex items-center gap-1.5 text-sm text-muted-foreground"
          aria-label="Story breadcrumb"
        >
          {epic ? (
            <>
              <Flag className="h-3.5 w-3.5 shrink-0 text-status-warning" aria-hidden />
              <span className="truncate">{epic.name}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </>
          ) : null}
          <span className="font-mono text-xs text-foreground-subtle">{story.identifier}</span>
        </nav>

        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
          {story.title}
        </h1>
      </header>

      <section className="space-y-3">
        <DescriptionEditor
          workspaceId={story.workspace_id}
          entityType="story"
          entityId={story.id}
          value={story.description_md}
          onChange={handlers.handleDescriptionChange}
          placeholder="Add a description…"
          variant="default"
          editorClassName={STORY_DESCRIPTION_EDITOR_CLASS}
          showLabel={false}
          embeddedCollaboration={embeddedCollaboration}
          previewWhenBlurred
        />
      </section>

      <div
        className="flex flex-wrap items-center gap-2"
        data-testid="story-add-to-story-chips"
        aria-label="Add to story"
      >
        <span className="text-xs text-muted-foreground">Add to story</span>
        <AddToStoryChip
          icon={<ListChecks className="h-3.5 w-3.5" />}
          label="Checklist"
          onClick={() => scrollToStoryDetailSection('relations')}
        />
        <AddToStoryChip
          icon={<Link2 className="h-3.5 w-3.5" />}
          label="Relationships"
          onClick={() => scrollToStoryDetailSection('relations')}
        />
        <AddToStoryChip
          icon={<Link2 className="h-3.5 w-3.5" />}
          label="External Links"
          onClick={() => {
            document.getElementById('attachments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
        <AddToStoryChip
          icon={<Paperclip className="h-3.5 w-3.5" />}
          label="Attach Files"
          onClick={() => scrollToStoryDetailSection('artifacts')}
        />
      </div>

      <SubStoriesList parentStory={story} />

      <StoryRelationsPanel story={story} />

      <section
        id="attachments"
        className="space-y-4 scroll-mt-4"
        data-testid="story-detail-attachments-section"
        data-story-section="attachments"
      >
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">External Links</h3>
        </div>
        <StoryAttachmentsPanel story={story} />
      </section>

      <StorySignalsPanel
        story={story}
        highlightedSignalId={highlightedSignalId}
        activity={handlers.storyActivity.activity}
        loading={handlers.storyActivity.loading}
        error={handlers.storyActivity.error}
        onRetry={handlers.storyActivity.reload}
        unifiedScroll={unifiedScroll}
      />

      <StoryHistoryPanel
        story={story}
        activity={handlers.storyActivity.activity}
        loading={handlers.storyActivity.loading}
        error={handlers.storyActivity.error}
        onRetry={handlers.storyActivity.reload}
        unifiedScroll={unifiedScroll}
        onSignalSelect={(activityEventId) => {
          setLocalHighlightedSignalId(activityEventId);
          storyStore.setDetailFocus({
            section: 'signals',
            highlightedSignalId: activityEventId,
          });
        }}
      />
    </div>
  );
}
