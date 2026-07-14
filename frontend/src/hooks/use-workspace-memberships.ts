'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listWorkspaces } from '@/lib/api/workspace-api';
import { isMockAuthEnabled } from '@/lib/api/config';
import { WORKSPACE_REGISTRY, type ResolvedWorkspace } from '@/lib/workspace/registry';
import { toResolvedWorkspace } from '@/lib/workspace/to-resolved-workspace';
import { queryKeys } from '@/lib/query/query-keys';
import { WORKSPACE_QUERY_STALE_MS } from '@/lib/query/query-client';

export interface UseWorkspaceMembershipsResult {
  workspaces: ResolvedWorkspace[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWorkspaceMemberships(): UseWorkspaceMembershipsResult {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.workspaces.memberships,
    queryFn: async (): Promise<ResolvedWorkspace[]> => {
      if (isMockAuthEnabled()) {
        return WORKSPACE_REGISTRY;
      }
      const rows = await listWorkspaces();
      return rows.map(toResolvedWorkspace);
    },
    staleTime: WORKSPACE_QUERY_STALE_MS,
    initialData: isMockAuthEnabled() ? WORKSPACE_REGISTRY : undefined,
  });

  return {
    workspaces: query.data ?? [],
    loading: query.isLoading && !query.data,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    refresh: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.memberships });
    },
  };
}
