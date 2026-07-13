'use client';

import * as React from 'react';
import type { Cycle } from '@landi-flow/core/types';
import { loadCycles } from '@/controllers/cycles-controller';

export interface UseTeamCyclesResult {
  cycles: Cycle[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useTeamCycles(
  workspaceId: string,
  teamId: string | null,
): UseTeamCyclesResult {
  const [cycles, setCycles] = React.useState<Cycle[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    if (!teamId) {
      setCycles([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    void loadCycles(workspaceId, teamId)
      .then((rows) => {
        setCycles(rows);
      })
      .catch((err: unknown) => {
        setCycles([]);
        setError(err instanceof Error ? err.message : 'Failed to load cycles');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [workspaceId, teamId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return { cycles, loading, error, refresh };
}
