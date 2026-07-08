'use client';

import * as React from 'react';
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
import { storyStore } from '@/stores/story-store';

const STORY_DETAIL_ROUTES = ['/workspace/stories', '/workspace/stories/board'] as const;
const STORY_SELECTION_PRESERVE_ROUTES = [
  ...STORY_DETAIL_ROUTES,
  '/workspace/inbox',
] as const;

function isStoryDetailRoute(pathname: string): boolean {
  return STORY_DETAIL_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function preservesStorySelection(pathname: string): boolean {
  return STORY_SELECTION_PRESERVE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

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
  const { stories, selectedStoryId } = useStoryStore();
  const selectedStory = stories.find((story) => story.id === selectedStoryId) ?? null;

  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const onStoryRoute = isStoryDetailRoute(pathname);
  const showModal =
    isModal && selectedStory !== null && (onStoryRoute || isPinned);

  React.useEffect(() => {
    if (!isModal || isPinned) {
      return;
    }
    if (!preservesStorySelection(pathname) && selectedStoryId) {
      storyStore.selectStory(null);
    }
  }, [isModal, isPinned, pathname, selectedStoryId]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (showModal) {
      if (!dialog.open) {
        dialog.showModal();
      }
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
    setExpanded(false);
  }, [showModal, setExpanded]);

  const handleCloseModal = React.useCallback((): void => {
    setPinned(false);
    setExpanded(false);
    storyStore.selectStory(null);
  }, [setExpanded, setPinned]);

  if (!showModal || !selectedStory) {
    return null;
  }

  return (
    <StoryDetailModal
      dialogRef={dialogRef}
      story={selectedStory}
      isExpanded={isExpanded}
      isPinned={isPinned}
      onClose={handleCloseModal}
      onTogglePin={() => setPinned((prev) => !prev)}
      onToggleExpand={() => setExpanded((prev) => !prev)}
    />
  );
}

interface StoryDetailModalProps {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  story: Story;
  isExpanded: boolean;
  isPinned: boolean;
  onClose: () => void;
  onTogglePin: () => void;
  onToggleExpand: () => void;
}

function StoryDetailModal({
  dialogRef,
  story,
  isExpanded,
  isPinned,
  onClose,
  onTogglePin,
  onToggleExpand,
}: StoryDetailModalProps): React.ReactElement {
  return (
    <dialog
      ref={dialogRef}
      data-testid="story-detail-modal"
      aria-labelledby="story-detail-modal-title"
      className={cn(
        'fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0',
        'backdrop:bg-black/50 backdrop:backdrop-blur-sm',
      )}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <div
        className={cn(
          'flex min-h-full justify-stretch p-0 sm:justify-end sm:p-4',
          isExpanded ? 'items-stretch' : 'items-stretch sm:items-start sm:py-[8vh]',
        )}
        onClick={(event) => {
          if (event.target === event.currentTarget && !isPinned) {
            onClose();
          }
        }}
      >
        <div
          className={cn(
            'flex max-h-full flex-col overflow-hidden border border-border bg-surface-elevated shadow-xl',
            isExpanded
              ? 'h-full w-full rounded-none sm:rounded-lg'
              : 'h-full w-full max-w-none rounded-none sm:h-[min(720px,calc(100vh-2rem))] sm:max-w-2xl sm:rounded-lg',
          )}
        >
          <StoryDetailPanelHeader
            story={story}
            isPinned={isPinned}
            isExpanded={isExpanded}
            showExpand
            onClose={onClose}
            onTogglePin={onTogglePin}
            onToggleExpand={onToggleExpand}
          />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <StoryDetailBody story={story} className="h-full" />
          </div>
        </div>
      </div>
    </dialog>
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

  return (
    <aside
      data-testid="story-detail-sidebar"
      className="flex h-full w-full flex-col border-t border-border lg:w-[360px] lg:border-s lg:border-t-0"
    >
      <StoryDetailPanelHeader
        story={story}
        isPinned={isPinned}
        onClose={onClose}
        onTogglePin={() => setPinned((prev) => !prev)}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <StoryDetailBody story={story} className="h-full" />
      </div>
    </aside>
  );
}

export interface StoryDetailSurfaceProps {
  story: Story | null;
  onClose: () => void;
}

/** Sidebar panel when layout is sidebar; modal is rendered by StoryDetailModalHost. */
export function StoryDetailSurface({
  story,
  onClose,
}: StoryDetailSurfaceProps): React.ReactElement | null {
  const { isSidebar } = useStoryDetailLayout();

  if (!story || !isSidebar) {
    return null;
  }

  return <StoryDetailSidebarPanel story={story} onClose={onClose} />;
}
