'use client';

import * as React from 'react';
import { useStoryStore } from '@/hooks/use-story-store';
import {
  scrollToStoryDetailSection,
  type StoryDetailSectionId,
} from '@/lib/story/story-detail-sections';

/** Scrolls the story detail surface to the focused section after modal/panel mount. */
export function StoryDetailSectionScroller({
  scrollRootTestId = 'story-detail-body',
}: {
  scrollRootTestId?: string;
}): null {
  const { detailFocus, selectedStoryId } = useStoryStore();
  const lastScrolledRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!selectedStoryId || !detailFocus.section) {
      lastScrolledRef.current = null;
      return;
    }

    const scrollKey = `${selectedStoryId}:${detailFocus.section}:${detailFocus.highlightedSignalId ?? ''}`;
    if (lastScrolledRef.current === scrollKey) {
      return;
    }

    const scroll = (): void => {
      scrollToStoryDetailSection(detailFocus.section as StoryDetailSectionId);
      lastScrolledRef.current = scrollKey;
    };

    const root = document.querySelector(`[data-testid="${scrollRootTestId}"]`);
    if (!root) {
      const timer = window.setTimeout(scroll, 100);
      return () => window.clearTimeout(timer);
    }

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scroll);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    selectedStoryId,
    detailFocus.section,
    detailFocus.highlightedSignalId,
    scrollRootTestId,
  ]);

  return null;
}
