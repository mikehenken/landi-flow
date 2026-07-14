'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Team } from '@landi-flow/core/types';
import { loadTeams } from '@/controllers/settings-completion-controller';
import { getDefaultTeamId } from '@/lib/api/workspace-context';
import { isMockAuthEnabled } from '@/lib/api/config';
import { DEMO_TEAM_ID } from '@/lib/seed-data';
import { queryKeys } from '@/lib/query/query-keys';
import { WORKSPACE_QUERY_STALE_MS } from '@/lib/query/query-client';

export interface UseWorkspaceTeamsResult {
  teams: Team[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  defaultTeamId: string | null;
}

export function useWorkspaceTeams(workspaceId: string): UseWorkspaceTeamsResult {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.teams.list(workspaceId),
    queryFn: () => loadTeams(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: WORKSPACE_QUERY_STALE_MS,
  });

  const teams = query.data ?? [];
  const defaultTeamId = isMockAuthEnabled()
    ? DEMO_TEAM_ID
    : getDefaultTeamId() ?? teams[0]?.id ?? null;

  return {
    teams,
    loading: query.isLoading && !query.data,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    refresh: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.teams.list(workspaceId) });
    },
    defaultTeamId,
  };
}
