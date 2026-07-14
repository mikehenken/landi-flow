'use client';

import { QueryClient } from '@tanstack/react-query';

/** Shared stale-while-revalidate defaults for workspace list data. */
export const WORKSPACE_QUERY_STALE_MS = 60_000;
export const WORKSPACE_QUERY_GC_MS = 10 * 60_000;

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: WORKSPACE_QUERY_STALE_MS,
        gcTime: WORKSPACE_QUERY_GC_MS,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}
