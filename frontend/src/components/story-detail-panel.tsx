'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import type { Story } from '@landi-flow/core/types';
import { Button, cn, useTranslations } from '@landi-flow/ui';
import { Maximize2, Minimize2, PanelRight, Pin, PinOff, X } from 'lucide-react';
import { usePathname } from '@/i18n/navigation';
import { StoryDetailBody } from '@/components/story-detail-body';
import {
  StoryDetailLayoutProvider,
  useStoryDetailLayout,
} from '@/components/story-detail-layout-context';
import { StoryDetailLayoutToggle } from '@/components/story-detail-layout-toggle';
import { useStoryStore } from '@/hooks/use-story-store';
import { useSelectedStoryId } from '@/hooks/use-selected-story-id';
import {
  isStoryModalRoute,
  preservesStorySelection,
} from '@/lib/story/story-detail-routes';
import { getStoryStore, storyStore } from '@/stores/story-store';

export interface StoryDetailLayoutRootProps {
  children: React.ReactNode;
}

/** Provider + global modal overlay for modal layout mode (CR-09r-006). */
export function StoryDetailLayoutRoot({
  children,
}: StoryDetailLayoutRootProps): React.ReactElement {
  return (
    <StoryDetailLayoutProvider>
      {children}
      <StoryDetailModalHost />
    </StoryDetailLayoutProvider>
  );
}

function StoryDetailModalHost(): React.ReactElement | null {
  const pathname = usePathname();
  const { isModal, isPinned, isExpanded, setExpanded, setPinned } = useStoryDetailLayout();
  const { stories } = useStoryStore();
  const selectedStoryId = useSelectedStoryId();
  const storeStories = getStoryStore().getServerSnapshot().stories;
  const selectedStory =
    stories.find(
      (story) => story.id === selectedStoryId || story.identifier === selectedStoryId,
    ) ??
    (selectedStoryId
      ? storeStories.find(
          (story) => story.id === selectedStoryId || story.identifier === selectedStoryId,
        ) ?? null
      : null);

  const onStoryModalRoute = isStoryModalRoute(pathname);
  // Once a story is resolved, show the modal on story-capable routes (or when pinned).
  // Route gating previously raced with next-intl pathname settling and left the dialog mounted but closed.
  const showModal =
    isModal &&
    selectedStory !== null &&
    (onStoryModalRoute || isPinned || preservesStorySelection(pathname));

  React.useEffect(() => {
    if (!isModal || isPinned) {
      return;
    }
    if (!preservesStorySelection(pathname) && selectedStoryId) {
      storyStore.selectStory(null);
    }
  }, [isModal, isPinned, pathname, selectedStoryId]);

  React.useEffect(() => {
    if (!showModal) {
      setExpanded(false);
    }
  }, [showModal, setExpanded]);

  const handleCloseModal = React.useCallback((): void => {
    setPinned(false);
    setExpanded(false);
    storyStore.clearDetailFocus();
    storyStore.selectStory(null);
  }, [setExpanded, setPinned]);

  // Native <dialog>.showModal() left production builds with fiber props
  // (visible/story set) but an empty closed dialog node. Portal overlay is
  // deterministic under OpenNext/Cloudflare and matches create-* stacking.
  if (!isModal || !showModal || !selectedStory) {
    return null;
  }

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <StoryDetailModal
      story={selectedStory}
      isExpanded={isExpanded}
      isPinned={isPinned}
      onClose={handleCloseModal}
      onTogglePin={() => setPinned((prev) => !prev)}
      onToggleExpand={() => setExpanded((prev) => !prev)}
    />,
    document.body,
  );
}

interface StoryDetailModalProps {
  story: Story;
  isExpanded: boolean;
  isPinned: boolean;
  onClose: () => void;
  onTogglePin: () => void;
  onToggleExpand: () => void;
}

function StoryDetailModal({
  story,
  isExpanded,
  isPinned,
  onClose,
  onTogglePin,
  onToggleExpand,
}: StoryDetailModalProps): React.ReactElement {
  const headerActions = (
    <StoryDetailModalControls
      isPinned={isPinned}
      isExpanded={isExpanded}
      onClose={onClose}
      onTogglePin={onTogglePin}
      onToggleExpand={onToggleExpand}
    />
  );

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      data-testid="story-detail-modal"
      data-story-detail-visible="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-detail-modal-title"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
    >
      <div
        className={cn(
          'flex min-h-full',
          isExpanded ? 'items-stretch justify-stretch p-0' : 'items-center justify-center p-[5vh_5vw]',
        )}
        onClick={(event) => {
          if (event.target === event.currentTarget && !isPinned) {
            onClose();
          }
        }}
      >
        <div
          className={cn(
            'relative flex min-h-0 w-full flex-col overflow-hidden border border-border/80 shadow-2xl',
            'bg-[#0b0e14]',
            isExpanded
              ? 'h-full max-h-full rounded-none'
              : 'h-[min(90vh,960px)] max-h-[90vh] w-[min(90vw,1400px)] max-w-[90vw] rounded-[10px]',
          )}
        >
          <span id="story-detail-modal-title" className="sr-only">
            {story.identifier} — {story.title}
          </span>
          <StoryDetailBody story={story} headerActions={headerActions} />
        </div>
      </div>
    </div>
  );
}

interface StoryDetailModalControlsProps {
  isPinned: boolean;
  isExpanded: boolean;
  onClose: () => void;
  onTogglePin: () => void;
  onToggleExpand: () => void;
}

function StoryDetailModalControls({
  isPinned,
  isExpanded,
  onClose,
  onTogglePin,
  onToggleExpand,
}: StoryDetailModalControlsProps): React.ReactElement {
  const t = useTranslations('navigation');

  return (
    <>
      <StoryDetailLayoutToggle compact />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={isPinned}
        aria-label={isPinned ? t('story_detail.unpin') : t('story_detail.pin')}
        title={isPinned ? t('story_detail.unpin') : t('story_detail.pin')}
        onClick={onTogglePin}
      >
        {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={isExpanded}
        aria-label={isExpanded ? t('story_detail.collapse') : t('story_detail.expand')}
        title={isExpanded ? t('story_detail.collapse') : t('story_detail.expand')}
        onClick={onToggleExpand}
      >
        {isExpanded ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={t('story_detail.close')}
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
    </>
  );
}

export interface StoryDetailPanelHeaderProps {
  story: Story;
  isPinned?: boolean;
  isExpanded?: boolean;
  showExpand?: boolean;
  onClose?: () => void;
  onTogglePin?: () => void;
  onToggleExpand?: () => void;
}

export function StoryDetailPanelHeader({
  story,
  isPinned = false,
  isExpanded = false,
  showExpand = false,
  onClose,
  onTogglePin,
  onToggleExpand,
}: StoryDetailPanelHeaderProps): React.ReactElement {
  const t = useTranslations('navigation');

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p
          id="story-detail-modal-title"
          className="truncate font-mono text-xs text-foreground-subtle"
        >
          {story.identifier}
        </p>
        <p className="truncate text-sm font-medium text-foreground">{story.title}</p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <StoryDetailLayoutToggle compact />
        {onTogglePin ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={isPinned}
            aria-label={isPinned ? t('story_detail.unpin') : t('story_detail.pin')}
            title={isPinned ? t('story_detail.unpin') : t('story_detail.pin')}
            onClick={onTogglePin}
          >
            {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </Button>
        ) : null}
        {showExpand && onToggleExpand ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={isExpanded}
            aria-label={
              isExpanded ? t('story_detail.collapse') : t('story_detail.expand')
            }
            title={isExpanded ? t('story_detail.collapse') : t('story_detail.expand')}
            onClick={onToggleExpand}
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        ) : null}
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t('story_detail.close')}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <PanelRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        )}
      </div>
    </div>
  );
}

export interface StoryDetailSidebarPanelProps {
  story: Story;
  onClose: () => void;
}

export function StoryDetailSidebarPanel({
  story,
  onClose,
}: StoryDetailSidebarPanelProps): React.ReactElement {
  const { isPinned, setPinned } = useStoryDetailLayout();

  const headerActions = (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={isPinned}
        aria-label={isPinned ? 'Unpin story' : 'Pin story'}
        onClick={() => setPinned((prev) => !prev)}
      >
        {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
      </Button>
      <Button type="button" variant="ghost" size="sm" aria-label="Close story" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </>
  );

  return (
    <aside
      data-testid="story-detail-sidebar"
      className="flex h-full w-full min-h-0 flex-col border-t border-border lg:w-[min(90vw,1200px)] lg:border-s lg:border-t-0"
    >
      <StoryDetailBody story={story} headerActions={headerActions} />
    </aside>
  );
}

export interface StoryDetailSurfaceProps {
  story?: Story | null;
  onClose: () => void;
}

/** Sidebar panel when layout is sidebar; modal is rendered by StoryDetailModalHost. */
export function StoryDetailSurface({
  story: storyProp,
  onClose,
}: StoryDetailSurfaceProps): React.ReactElement | null {
  const { isSidebar } = useStoryDetailLayout();
  const selectedStoryId = useSelectedStoryId();
  const { stories } = useStoryStore();
  const storeStories = getStoryStore().getServerSnapshot().stories;
  const story =
    storyProp ??
    (selectedStoryId
      ? stories.find(
          (row) => row.id === selectedStoryId || row.identifier === selectedStoryId,
        ) ??
        storeStories.find(
          (row) => row.id === selectedStoryId || row.identifier === selectedStoryId,
        ) ??
        null
      : null);

  if (!story || !isSidebar) {
    return null;
  }

  return <StoryDetailSidebarPanel story={story} onClose={onClose} />;
}
