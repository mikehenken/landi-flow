'use client';

import { useEffect, useState } from 'react';
import {
  STORY_STORE_CHANGE_EVENT,
  STORY_STORE_GLOBAL_KEY,
  getStoryStore,
  type StoryStoreState,
} from '@/stores/story-store';

type GlobalStoryStore = {
  getServerSnapshot: () => StoryStoreState;
  subscribe: (listener: () => void) => () => void;
};

type StoryStoreGlobal = typeof globalThis & {
  [STORY_STORE_GLOBAL_KEY]?: GlobalStoryStore;
};

const EMPTY_SNAPSHOT: StoryStoreState = {
  stories: [],
  selectedStoryId: null,
  detailFocus: { section: null, highlightedSignalId: null },
  loading: false,
  error: null,
};

/**
 * Read the process-wide store that list clicks mutate in production.
 * Never trust a module-local singleton — OpenNext chunk splits diverge.
 */
export function readGlobalStorySnapshot(): StoryStoreState {
  const pinned = (globalThis as StoryStoreGlobal)[STORY_STORE_GLOBAL_KEY];
  if (pinned && typeof pinned.getServerSnapshot === 'function') {
    return pinned.getServerSnapshot();
  }
  return getStoryStore().getServerSnapshot();
}

function readGlobalStoryStore(): GlobalStoryStore | null {
  const pinned = (globalThis as StoryStoreGlobal)[STORY_STORE_GLOBAL_KEY];
  if (pinned && typeof pinned.subscribe === 'function') {
    return pinned;
  }
  return getStoryStore();
}

function snapshotsVisiblyEqual(a: StoryStoreState, b: StoryStoreState): boolean {
  return (
    a.selectedStoryId === b.selectedStoryId &&
    a.stories.length === b.stories.length &&
    a.loading === b.loading &&
    a.error === b.error &&
    a.detailFocus.section === b.detailFocus.section &&
    a.detailFocus.highlightedSignalId === b.detailFocus.highlightedSignalId
  );
}

export interface CanonicalStoryStoreHook {
  snap: StoryStoreState;
  /** Bumps when global selection changes — use as React `key` to force remount. */
  hostEpoch: number;
}

/**
 * Story detail host must follow `globalThis.__landiFlowStoryStore` only.
 *
 * Live GATE 2 on fcb1c74/dff9fc7: useSyncExternalStore + subscribeStoryStore
 * left `dataset.storyDetailDebug.selectedStoryId=null` while the global already
 * held GEN-*. This hook bypasses that path with:
 * 1. direct global reads
 * 2. store.subscribe on the pinned instance
 * 3. STORY_STORE_CHANGE_EVENT
 * 4. short-interval poll as OpenNext production safety net
 */
export function useCanonicalStoryStore(): CanonicalStoryStoreHook {
  const [snap, setSnap] = useState<StoryStoreState>(() =>
    typeof globalThis !== 'undefined' ? readGlobalStorySnapshot() : EMPTY_SNAPSHOT,
  );
  const [hostEpoch, setHostEpoch] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let unsubStore: (() => void) | null = null;
    let lastSelectedId: string | null = readGlobalStorySnapshot().selectedStoryId;

    const apply = (): void => {
      if (cancelled) {
        return;
      }
      const next = readGlobalStorySnapshot();
      setSnap((prev) => (snapshotsVisiblyEqual(prev, next) ? prev : next));
      if (next.selectedStoryId !== lastSelectedId) {
        lastSelectedId = next.selectedStoryId;
        setHostEpoch((epoch) => epoch + 1);
      }
    };

    const bindStore = (): void => {
      unsubStore?.();
      unsubStore = null;
      const store = readGlobalStoryStore();
      if (store) {
        unsubStore = store.subscribe(apply);
      }
    };

    bindStore();
    apply();

    const onWindowChange = (): void => {
      bindStore();
      apply();
    };

    window.addEventListener(STORY_STORE_CHANGE_EVENT, onWindowChange);
    const pollId = window.setInterval(apply, 200);

    return () => {
      cancelled = true;
      unsubStore?.();
      window.removeEventListener(STORY_STORE_CHANGE_EVENT, onWindowChange);
      window.clearInterval(pollId);
    };
  }, []);

  return { snap, hostEpoch };
}
