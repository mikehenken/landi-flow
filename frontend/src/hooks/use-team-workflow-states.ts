'use client';

import * as React from 'react';
import type { WorkflowState } from '@landi-flow/core/types';
import { loadWorkflowStates } from '@/controllers/workflow-states-controller';
import { DEMO_WORKFLOW_STATE_ROWS } from '@/lib/seed-data';
import { isMockAuthEnabled } from '@/lib/api/config';
import { getWorkflowStatesForTeam } from '@/lib/api/workspace-context';
import { isUuid } from '@landi-flow/core/mcp';

export interface UseTeamWorkflowStatesResult {
  workflowStates: WorkflowState[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useTeamWorkflowStates(
  workspaceId: string,
  teamId: string | null,
): UseTeamWorkflowStatesResult {
  const [workflowStates, setWorkflowStates] = React.useState<WorkflowState[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    if (!teamId || (!isMockAuthEnabled() && !isUuid(teamId))) {
      setWorkflowStates([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (isMockAuthEnabled()) {
      setWorkflowStates(DEMO_WORKFLOW_STATE_ROWS.filter((state) => state.team_id === teamId));
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    void loadWorkflowStates(workspaceId, teamId)
      .then((rows) => {
        setWorkflowStates(rows);
      })
      .catch((err: unknown) => {
        const cached = getWorkflowStatesForTeam();
        setWorkflowStates(cached.length > 0 ? cached : []);
        setError(err instanceof Error ? err.message : 'Failed to load workflow states');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [workspaceId, teamId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return { workflowStates, loading, error, refresh };
}
