'use client';

import { useSyncExternalStore } from 'react';
import { epicStore, type EpicStoreState } from '@/stores/epic-store';

export function useEpicStore(): EpicStoreState {
  return useSyncExternalStore(
    (listener) => epicStore.subscribe(listener),
    () => epicStore.getServerSnapshot(),
    () => epicStore.getServerSnapshot(),
  );
}
