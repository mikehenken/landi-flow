'use client';

import * as React from 'react';
import { loadEpicLabels } from '@/controllers/labels-controller';
import type { TaxonomyLabel } from '@/lib/taxonomy/taxonomy-types';

export interface UseWorkspaceEpicLabelsResult {
  labels: TaxonomyLabel[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWorkspaceEpicLabels(workspaceId: string): UseWorkspaceEpicLabelsResult {
  const [labels, setLabels] = React.useState<TaxonomyLabel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    setLoading(true);
    setError(null);
    void loadEpicLabels(workspaceId)
      .then((rows) => {
        setLabels(rows);
      })
      .catch((err: unknown) => {
        setLabels([]);
        setError(err instanceof Error ? err.message : 'Failed to load epic labels');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [workspaceId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return { labels, loading, error, refresh };
}
