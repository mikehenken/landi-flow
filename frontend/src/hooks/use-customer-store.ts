'use client';

import * as React from 'react';
import { customerStore } from '@/stores/customer-store';

export function useCustomerStore() {
  return React.useSyncExternalStore(
    (listener) => customerStore.subscribe(listener),
    () => customerStore.getServerSnapshot(),
    () => customerStore.getServerSnapshot(),
  );
}
