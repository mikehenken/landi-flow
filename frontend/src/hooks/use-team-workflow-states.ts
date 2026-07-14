'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { WorkflowState } from '@landi-flow/core/types';
import { loadWorkflowStates } from '@/controllers/workflow-states-controller';
import { DEMO_WORKFLOW_STATE_ROWS } from '@/lib/seed-data';
import { isMockAuthEnabled } from '@/lib/api/config';
import { getWorkflowStatesForTeam } from '@/lib/api/workspace-context';
import { isUuid } from '@landi-flow/core/mcp';
import { queryKeys } from '@/lib/query/query-keys';
import { WORKSPACE_QUERY_STALE_MS } from '@/lib/query/query-client';

export interface UseTeamWorkflowStatesResult {
  workflowStates: WorkflowState[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function resolveCachedWorkflowStates(teamId: string | null): WorkflowState[] {
  if (!teamId) {
    return [];
  }
  if (isMockAuthEnabled()) {
    return DEMO_WORKFLOW_STATE_ROWS.filter((state) => state.team_id === teamId);
  }
  const fromContext = getWorkflowStatesForTeam();
  if (fromContext.length > 0) {
    return fromContext.filter((state) => !state.team_id || state.team_id === teamId);
  }
  return [];
}

async function fetchTeamWorkflowStates(
  workspaceId: string,
  teamId: string,
): Promise<WorkflowState[]> {
  if (isMockAuthEnabled()) {
    return DEMO_WORKFLOW_STATE_ROWS.filter((state) => state.team_id === teamId);
  }
  // Prefer already-hydrated runtime context — avoid duplicate network.
  const fromContext = getWorkflowStatesForTeam();
  if (fromContext.length > 0) {
    const scoped = fromContext.filter(
      (state) => !state.team_id || state.team_id === teamId,
    );
    if (scoped.length > 0) {
      return scoped;
    }
  }
  return loadWorkflowStates(workspaceId, teamId);
}

export function useTeamWorkflowStates(
  workspaceId: string,
  teamId: string | null,
): UseTeamWorkflowStatesResult {
  const queryClient = useQueryClient();
  const canFetch = Boolean(teamId && (isMockAuthEnabled() || isUuid(teamId)));
  const cached = resolveCachedWorkflowStates(teamId);

  const query = useQuery<WorkflowState[]>({
    queryKey: queryKeys.workflowStates.team(workspaceId, teamId ?? 'none'),
    queryFn: () => {
      if (!teamId) {
        return Promise.resolve([] as WorkflowState[]);
      }
      return fetchTeamWorkflowStates(workspaceId, teamId);
    },
    enabled: canFetch,
    staleTime: WORKSPACE_QUERY_STALE_MS,
    placeholderData: cached.length > 0 ? cached : undefined,
  });

  const workflowStates = query.data ?? cached;
  const hasRows = workflowStates.length > 0;

  return {
    workflowStates,
    loading: Boolean(canFetch) && query.isPending && !hasRows,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? String(query.error)
          : null,
    refresh: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workflowStates.team(workspaceId, teamId ?? 'none'),
      });
    },
  };
}
