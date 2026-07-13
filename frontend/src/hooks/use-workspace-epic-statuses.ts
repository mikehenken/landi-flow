'use client';

import * as React from 'react';
import { isMockAuthEnabled } from '@/lib/api/config';
import {
  getDefaultEpicStatusId,
  getEpicStatuses,
  loadWorkspaceRuntimeContext,
  type EpicStatusRow,
} from '@/lib/api/workspace-context';
import { EPIC_STATUS_IDS } from '@/lib/epic-status';
import { getTaxonomySettings } from '@/lib/taxonomy/taxonomy-store';

export interface UseWorkspaceEpicStatusesResult {
  epicStatuses: EpicStatusRow[];
  defaultStatusId: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
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

export function useWorkspaceEpicStatuses(workspaceId: string): UseWorkspaceEpicStatusesResult {
  const [epicStatuses, setEpicStatuses] = React.useState<EpicStatusRow[]>([]);
  const [defaultStatusId, setDefaultStatusId] = React.useState<string | null>(
    isMockAuthEnabled() ? EPIC_STATUS_IDS.backlog : null,
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    if (isMockAuthEnabled()) {
      const mockStatuses = getMockEpicStatuses();
      setEpicStatuses(mockStatuses);
      setDefaultStatusId(EPIC_STATUS_IDS.backlog);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    void loadWorkspaceRuntimeContext(workspaceId)
      .then((ctx) => {
        setEpicStatuses(ctx.epicStatuses);
        setDefaultStatusId(
          ctx.defaultEpicStatusId ??
            ctx.epicStatuses.find((status) => status.category === 'backlog')?.id ??
            ctx.epicStatuses[0]?.id ??
            null,
        );
      })
      .catch((err: unknown) => {
        const cached = getEpicStatuses();
        setEpicStatuses(cached);
        setDefaultStatusId(resolveDefaultStatusId(cached));
        setError(err instanceof Error ? err.message : 'Failed to load epic statuses');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [workspaceId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return { epicStatuses, defaultStatusId, loading, error, refresh };
}
