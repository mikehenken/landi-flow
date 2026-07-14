'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  STORY_STORE_CHANGE_EVENT,
  STORY_STORE_GLOBAL_KEY,
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

/** Read ONLY `globalThis.__landiFlowStoryStore` — never the module singleton. */
export function readPinnedLandiFlowStorySnapshot(): StoryStoreState {
  const pinned = (globalThis as StoryStoreGlobal)[STORY_STORE_GLOBAL_KEY];
  if (pinned && typeof pinned.getServerSnapshot === 'function') {
    return pinned.getServerSnapshot();
  }
  return EMPTY_SNAPSHOT;
}

function getPinnedLandiFlowStoryStore(): GlobalStoryStore | null {
  const pinned = (globalThis as StoryStoreGlobal)[STORY_STORE_GLOBAL_KEY];
  if (
    pinned &&
    typeof pinned.getServerSnapshot === 'function' &&
    typeof pinned.subscribe === 'function'
  ) {
    return pinned;
  }
  return null;
}

function subscribePinnedLandiFlowStoryStore(onStoreChange: () => void): () => void {
  let unsub: (() => void) | null = null;

  const bind = (): void => {
    unsub?.();
    unsub = null;
    const store = getPinnedLandiFlowStoryStore();
    if (store) {
      unsub = store.subscribe(onStoreChange);
    }
  };

  bind();

  const onWindowChange = (): void => {
    bind();
    onStoreChange();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(STORY_STORE_CHANGE_EVENT, onWindowChange);
  }

  return () => {
    unsub?.();
    if (typeof window !== 'undefined') {
      window.removeEventListener(STORY_STORE_CHANGE_EVENT, onWindowChange);
    }
  };
}

function pickRicherSnapshot(
  a: StoryStoreState,
  b: StoryStoreState,
): StoryStoreState {
  return {
    stories: a.stories.length > 0 ? a.stories : b.stories,
    selectedStoryId: a.selectedStoryId ?? b.selectedStoryId,
    detailFocus: a.selectedStoryId ? a.detailFocus : b.detailFocus,
    loading: a.loading || b.loading,
    error: a.error ?? b.error,
  };
}

/**
 * Story detail host subscription — dual path for OpenNext production:
 * 1. `useSyncExternalStore` bound to `globalThis.__landiFlowStoryStore` only
 * 2. Window `landi-flow-story-store-changed` → `setState` from that same object
 */
export function useGlobalLandiFlowStoryStore(): StoryStoreState {
  const synced = useSyncExternalStore(
    subscribePinnedLandiFlowStoryStore,
    readPinnedLandiFlowStorySnapshot,
    () => EMPTY_SNAPSHOT,
  );

  const [forced, setForced] = useState<StoryStoreState>(() =>
    typeof globalThis !== 'undefined'
      ? readPinnedLandiFlowStorySnapshot()
      : EMPTY_SNAPSHOT,
  );

  useEffect(() => {
    let cancelled = false;

    const applyFromGlobal = (): void => {
      if (cancelled) {
        return;
      }
      setForced(readPinnedLandiFlowStorySnapshot());
    };

    applyFromGlobal();

    if (typeof window === 'undefined') {
      return () => {
        cancelled = true;
      };
    }

    window.addEventListener(STORY_STORE_CHANGE_EVENT, applyFromGlobal);
    const pollId = window.setInterval(applyFromGlobal, 100);

    return () => {
      cancelled = true;
      window.removeEventListener(STORY_STORE_CHANGE_EVENT, applyFromGlobal);
      window.clearInterval(pollId);
    };
  }, []);

  return pickRicherSnapshot(forced, synced);
}
