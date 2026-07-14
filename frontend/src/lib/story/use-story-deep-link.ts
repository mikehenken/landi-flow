'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import {
  buildStoryModalQueryString,
  openStoryModal,
  resolveStoryIdFromQuery,
  type OpenStoryModalOptions,
} from '@/lib/story/open-story-modal';
import { isStoryDetailSectionId } from '@/lib/story/story-detail-sections';
import { useStoryStore } from '@/hooks/use-story-store';
import { useSelectedStoryId } from '@/hooks/use-selected-story-id';
import { getStoryStore, storyStore } from '@/stores/story-store';

/**
 * Opens story detail from `?story=` (identifier or id) and keeps the URL in sync
 * when selection clears. Shared by inbox, stories list, and board.
 */
export function useStoryDeepLink(): void {
  const selectedStoryId = useSelectedStoryId();
  const { stories } = useStoryStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const storyParam = searchParams.get('story');
    const store = getStoryStore();
    const storeStories = store.getServerSnapshot().stories;
    if (!storyParam || storeStories.length === 0) {
      return;
    }

    const storyId = resolveStoryIdFromQuery(storyParam, storeStories);
    if (!storyId) {
      const byIdentifier = storeStories.find(
        (story) => story.identifier.toLowerCase() === storyParam.toLowerCase(),
      );
      if (byIdentifier) {
        openStoryModal(byIdentifier.id);
      }
      return;
    }

    const sectionParam = searchParams.get('section');
    const signalParam = searchParams.get('signal');
    const section =
      sectionParam && isStoryDetailSectionId(sectionParam) ? sectionParam : undefined;

    const focus = store.getServerSnapshot().detailFocus;
    if (
      selectedStoryId === storyId &&
      focus.section === (section ?? null) &&
      focus.highlightedSignalId === (signalParam ?? null)
    ) {
      return;
    }

    openStoryModal(storyId, {
      section,
      highlightedSignalId: signalParam,
    });
  }, [searchParams, selectedStoryId, stories.length]);

  React.useEffect(() => {
    if (selectedStoryId !== null) {
      return;
    }
    if (!searchParams.get('story')) {
      return;
    }
    router.replace(pathname, { scroll: false });
  }, [pathname, router, searchParams, selectedStoryId]);
}

export function syncStoryModalUrl(
  pathname: string,
  story: { id: string; identifier: string } | undefined,
  options?: OpenStoryModalOptions,
): string {
  if (!story) {
    return pathname;
  }
  const query = buildStoryModalQueryString(story, options);
  return query.length > 0 ? `${pathname}?${query}` : pathname;
}

/**
 * Opens story detail and writes `?story=` (and optional section/signal) to the URL.
 * Use for list/board/inbox clicks so GATE 2 reload restores the open story.
 */
export function useStoryModalSelect(): (
  storyId: string,
  options?: OpenStoryModalOptions,
) => void {
  const router = useRouter();
  const pathname = usePathname();

  return React.useCallback(
    (storyId: string, options?: OpenStoryModalOptions) => {
      openStoryModal(storyId, options);
      const story =
        storyStore.getServerSnapshot().stories.find((row) => row.id === storyId) ??
        storyStore.getServerSnapshot().stories.find(
          (row) => row.identifier.toLowerCase() === storyId.toLowerCase(),
        );
      router.replace(syncStoryModalUrl(pathname, story, options), { scroll: false });
    },
    [pathname, router],
  );
}
