'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isMockAuthEnabled } from '@/lib/api/config';
import {
  getDefaultEpicStatusId,
  getEpicStatuses,
  loadWorkspaceRuntimeContext,
  type EpicStatusRow,
} from '@/lib/api/workspace-context';
import { EPIC_STATUS_IDS } from '@/lib/epic-status';
import { getTaxonomySettings } from '@/lib/taxonomy/taxonomy-store';
import { queryKeys } from '@/lib/query/query-keys';
import { WORKSPACE_QUERY_STALE_MS } from '@/lib/query/query-client';

export interface UseWorkspaceEpicStatusesResult {
  epicStatuses: EpicStatusRow[];
  defaultStatusId: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface EpicStatusesQueryData {
  epicStatuses: EpicStatusRow[];
  defaultStatusId: string | null;
}

function getMockEpicStatuses(): EpicStatusRow[] {
  return getTaxonomySettings().epic_status_groups.map((group) => ({
    id: group.id,
    name: group.name,
    category: group.category,
  }));
}

function resolveDefaultStatusId(statuses: EpicStatusRow[]): string | null {
  const fromApi = getDefaultEpicStatusId();
  if (fromApi) {
    return fromApi;
  }
  return (
    statuses.find((status) => status.category === 'backlog')?.id ??
    statuses[0]?.id ??
    null
  );
}

async function fetchEpicStatuses(workspaceId: string): Promise<EpicStatusesQueryData> {
  if (isMockAuthEnabled()) {
    return {
      epicStatuses: getMockEpicStatuses(),
      defaultStatusId: EPIC_STATUS_IDS.backlog,
    };
  }
  // Reuse hydrated runtime context when present — no extra round-trip.
  const existing = getEpicStatuses();
  if (existing.length > 0) {
    return {
      epicStatuses: existing,
      defaultStatusId: resolveDefaultStatusId(existing),
    };
  }
  const ctx = await loadWorkspaceRuntimeContext(workspaceId);
  return {
    epicStatuses: ctx.epicStatuses,
    defaultStatusId:
      ctx.defaultEpicStatusId ??
      ctx.epicStatuses.find((status) => status.category === 'backlog')?.id ??
      ctx.epicStatuses[0]?.id ??
      null,
  };
}

export function useWorkspaceEpicStatuses(workspaceId: string): UseWorkspaceEpicStatusesResult {
  const queryClient = useQueryClient();
  const cachedStatuses = isMockAuthEnabled() ? getMockEpicStatuses() : getEpicStatuses();
  const placeholder: EpicStatusesQueryData | undefined =
    cachedStatuses.length > 0
      ? {
          epicStatuses: cachedStatuses,
          defaultStatusId: isMockAuthEnabled()
            ? EPIC_STATUS_IDS.backlog
            : resolveDefaultStatusId(cachedStatuses),
        }
      : undefined;

  const query = useQuery<EpicStatusesQueryData>({
    queryKey: queryKeys.epicStatuses.workspace(workspaceId),
    queryFn: () => fetchEpicStatuses(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: WORKSPACE_QUERY_STALE_MS,
    placeholderData: placeholder,
  });

  const epicStatuses = query.data?.epicStatuses ?? cachedStatuses;
  const defaultStatusId =
    query.data?.defaultStatusId ??
    (isMockAuthEnabled() ? EPIC_STATUS_IDS.backlog : resolveDefaultStatusId(cachedStatuses));

  return {
    epicStatuses,
    defaultStatusId,
    loading: Boolean(workspaceId) && query.isPending && epicStatuses.length === 0,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? String(query.error)
          : null,
    refresh: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.epicStatuses.workspace(workspaceId),
      });
    },
  };
}
