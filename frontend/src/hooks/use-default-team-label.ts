'use client';

import * as React from 'react';
import { useWorkspaceTeams } from '@/hooks/use-workspace-teams';
import { useWorkspace } from '@/lib/workspace';

/**
 * Live default team display name for breadcrumbs (never hardcoded "Team Design").
 */
export function useDefaultTeamLabel(fallback = 'Team'): string {
  const { workspace } = useWorkspace();
  const { teams, defaultTeamId } = useWorkspaceTeams(workspace.id);

  return React.useMemo(() => {
    if (!defaultTeamId) {
      return teams[0]?.name?.trim() || fallback;
    }
    const match = teams.find((team) => team.id === defaultTeamId);
    return match?.name?.trim() || teams[0]?.name?.trim() || fallback;
  }, [teams, defaultTeamId, fallback]);
}
