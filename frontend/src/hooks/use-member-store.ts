'use client';

import * as React from 'react';
import { memberStore } from '@/stores/member-store';

export function useMemberStore() {
  return React.useSyncExternalStore(
    (listener) => memberStore.subscribe(listener),
    () => memberStore.getServerSnapshot(),
    () => memberStore.getServerSnapshot(),
  );
}
