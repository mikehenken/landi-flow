'use client';

import * as React from 'react';
import { listWorkspaces } from '@/lib/api/workspace-api';
import { isMockAuthEnabled } from '@/lib/api/config';
import { WORKSPACE_REGISTRY, type ResolvedWorkspace } from '@/lib/workspace/registry';
import { toResolvedWorkspace } from '@/lib/workspace/to-resolved-workspace';

export interface UseWorkspaceMembershipsResult {
  workspaces: ResolvedWorkspace[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWorkspaceMemberships(): UseWorkspaceMembershipsResult {
  const [workspaces, setWorkspaces] = React.useState<ResolvedWorkspace[]>(() =>
    isMockAuthEnabled() ? WORKSPACE_REGISTRY : [],
  );
  const [loading, setLoading] = React.useState(!isMockAuthEnabled());
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    if (isMockAuthEnabled()) {
      setWorkspaces(WORKSPACE_REGISTRY);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    void listWorkspaces()
      .then((rows) => {
        setWorkspaces(rows.map(toResolvedWorkspace));
      })
      .catch((err: unknown) => {
        setWorkspaces([]);
        setError(err instanceof Error ? err.message : 'Failed to load workspaces');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return { workspaces, loading, error, refresh };
}
