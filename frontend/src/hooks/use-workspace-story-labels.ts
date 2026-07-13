'use client';

import * as React from 'react';
import { loadStoryLabels } from '@/controllers/labels-controller';
import type { TaxonomyLabel } from '@/lib/taxonomy/taxonomy-types';

export interface UseWorkspaceStoryLabelsResult {
  labels: TaxonomyLabel[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWorkspaceStoryLabels(workspaceId: string): UseWorkspaceStoryLabelsResult {
  const [labels, setLabels] = React.useState<TaxonomyLabel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    setLoading(true);
    setError(null);
    void loadStoryLabels(workspaceId)
      .then((rows) => {
        setLabels(rows);
      })
      .catch((err: unknown) => {
        setLabels([]);
        setError(err instanceof Error ? err.message : 'Failed to load story labels');
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
