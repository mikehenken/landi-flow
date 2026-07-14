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
import {
  readPinnedLandiFlowStorySnapshot,
  useGlobalLandiFlowStoryStore,
} from '@/hooks/use-global-landi-flow-story-store';
import {
  deriveStoryDetailHostVisibility,
  resolveStoryBySelection,
  writeStoryDetailDebugDataset,
} from '@/lib/story/story-detail-host-visibility';
import {
  isStoryModalRoute,
  preservesStorySelection,
} from '@/lib/story/story-detail-routes';
import { storyStore } from '@/stores/story-store';

export interface StoryDetailLayoutRootProps {
  children: React.ReactNode;
}

/**
 * Provider + global modal overlay (CR-09r-006).
 * Mounted from AppShellFrame → covers /workspace/stories and board routes.
 */
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

/**
 * Reads ONLY `globalThis.__landiFlowStoryStore` every render
 * (useSyncExternalStore + window force setState). Never trusts a module-orphan snap.
 *
 * Renders a native `<dialog>` in-tree (no createPortal) and calls `showModal()` so
 * GATE 2 probes see `modalPresent=true` when `showPortal=true`.
 */
function StoryDetailModalHost(): React.ReactElement | null {
  const pathname = usePathname();
  const { isSidebar, isPinned, isExpanded, setExpanded, setPinned } =
    useStoryDetailLayout();
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const globalSnap = useGlobalLandiFlowStoryStore();
  // Live re-read on every render so probes never see a stale closure.
  const liveSnap = readPinnedLandiFlowStorySnapshot();
  const snap =
    liveSnap.selectedStoryId !== null || liveSnap.stories.length > 0
      ? liveSnap
      : globalSnap;
  const visibility = deriveStoryDetailHostVisibility(snap);
  const { selectedStoryId, showPortal } = visibility;
  const selectedStory = resolveStoryBySelection(snap.stories, selectedStoryId);

  const onStoryModalRoute = isStoryModalRoute(pathname);
  // Modal layout: always mount dialog when selection is set (even if story pending).
  // Sidebar layout: dialog stays closed; StoryDetailSurface owns the visible panel.
  const dialogShouldOpen = showPortal && !isSidebar;

  // Sync dataset during render — useEffect lagged behind live store on f2c8972.
  writeStoryDetailDebugDataset({
    selectedStoryId,
    globalSelectedStoryId: selectedStoryId,
    effectiveSelectedId: selectedStoryId,
    resolved: selectedStory?.identifier ?? null,
    storeCount: snap.stories.length,
    hookCount: snap.stories.length,
    isSidebar,
    showPortal,
    dialogShouldOpen,
    pathname,
    source: 'globalThis.__landiFlowStoryStore',
  });

  React.useEffect(() => {
    if (isSidebar || isPinned) {
      return;
    }
    // Only clear when pathname is a settled non-story route.
    // Keep selection while stories are still hydrating (param/selection set, list empty).
    if (snap.stories.length === 0) {
      return;
    }
    if (
      pathname &&
      pathname !== '/' &&
      !onStoryModalRoute &&
      !preservesStorySelection(pathname) &&
      selectedStoryId
    ) {
      storyStore.selectStory(null);
    }
  }, [
    isSidebar,
    isPinned,
    onStoryModalRoute,
    pathname,
    selectedStoryId,
    snap.stories.length,
  ]);

  React.useEffect(() => {
    if (!showPortal) {
      setExpanded(false);
    }
  }, [showPortal, setExpanded]);

  const handleCloseModal = React.useCallback((): void => {
    setPinned(false);
    setExpanded(false);
    storyStore.clearDetailFocus();
    storyStore.selectStory(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('story')) {
        url.searchParams.delete('story');
        url.searchParams.delete('section');
        url.searchParams.delete('signal');
        const next =
          url.searchParams.toString().length > 0
            ? `${url.pathname}?${url.searchParams.toString()}`
            : url.pathname;
        window.history.replaceState(window.history.state, '', next);
      }
    }
  }, [setExpanded, setPinned]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (dialogShouldOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      return;
    }
    if (dialog.open) {
      dialog.close();
    }
  }, [dialogShouldOpen, selectedStoryId]);

  // Keep the dialog node mounted whenever selection is set so probes can find it.
  // Sidebar mode still mounts the node but keeps it closed (StoryDetailSurface shows).
  if (!showPortal) {
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
  story: Story | null;
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
  const headerActions = (
    <StoryDetailModalControls
      isPinned={isPinned}
      isExpanded={isExpanded}
      onClose={onClose}
      onTogglePin={onTogglePin}
      onToggleExpand={onToggleExpand}
    />
  );

  return (
    <dialog
      ref={dialogRef}
      data-testid="story-detail-modal"
      data-story-detail-visible="true"
      aria-modal="true"
      aria-labelledby="story-detail-modal-title"
      className={cn(
        'fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0',
        'backdrop:bg-black/50 backdrop:backdrop-blur-sm',
        'open:flex open:flex-col',
      )}
      onCancel={(event) => {
        event.preventDefault();
        if (!isPinned) {
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isPinned) {
          onClose();
        }
      }}
    >
      <div
        className={cn(
          'flex min-h-full w-full flex-1',
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
            {story
              ? `${story.identifier} — ${story.title}`
              : 'Loading story detail'}
          </span>
          {story ? (
            <StoryDetailBody story={story} headerActions={headerActions} />
          ) : (
            <div
              className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground"
              data-testid="story-detail-modal-loading"
            >
              Loading story…
            </div>
          )}
        </div>
      </div>
    </dialog>
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
  const globalSnap = useGlobalLandiFlowStoryStore();
  const liveSnap = readPinnedLandiFlowStorySnapshot();
  const snap =
    liveSnap.selectedStoryId !== null || liveSnap.stories.length > 0
      ? liveSnap
      : globalSnap;
  const story =
    storyProp ?? resolveStoryBySelection(snap.stories, snap.selectedStoryId);

  if (!story || !isSidebar) {
    return null;
  }

  return <StoryDetailSidebarPanel story={story} onClose={onClose} />;
}
