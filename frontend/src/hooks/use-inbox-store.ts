'use client';

import { useSyncExternalStore } from 'react';
import { inboxStore, type InboxStoreState } from '@/stores/inbox-store';

export function useInboxStore(): InboxStoreState {
  return useSyncExternalStore(
    (listener) => inboxStore.subscribe(listener),
    () => inboxStore.getServerSnapshot(),
    () => inboxStore.getServerSnapshot(),
  );
}
