'use client';

import * as React from 'react';
import type { Team } from '@landi-flow/core/types';
import { loadTeams } from '@/controllers/settings-completion-controller';
import { getDefaultTeamId } from '@/lib/api/workspace-context';
import { isMockAuthEnabled } from '@/lib/api/config';
import { DEMO_TEAM_ID } from '@/lib/seed-data';

export interface UseWorkspaceTeamsResult {
  teams: Team[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  defaultTeamId: string | null;
}

export function useWorkspaceTeams(workspaceId: string): UseWorkspaceTeamsResult {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    setLoading(true);
    setError(null);
    void loadTeams(workspaceId)
      .then((rows) => {
        setTeams(rows);
      })
      .catch((err: unknown) => {
        setTeams([]);
        setError(err instanceof Error ? err.message : 'Failed to load teams');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [workspaceId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const defaultTeamId = isMockAuthEnabled()
    ? DEMO_TEAM_ID
    : getDefaultTeamId() ?? teams[0]?.id ?? null;

  return { teams, loading, error, refresh, defaultTeamId };
}
