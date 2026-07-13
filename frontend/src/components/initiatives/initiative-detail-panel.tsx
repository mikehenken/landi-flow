'use client';

import * as React from 'react';
import type { Epic, Initiative } from '@landi-flow/core/types';
import { Button } from '@landi-flow/ui';
import { useEpicStore } from '@/hooks/use-epic-store';
import { isMockAuthEnabled } from '@/lib/api/config';
import { attachEpicToInitiative, getInitiativeById } from '@/lib/initiatives/initiatives-store';
import { useWorkspace } from '@/lib/workspace';

export interface InitiativeDetailPanelProps {
  initiativeId: string;
}

interface InitiativesListResponse {
  ok: boolean;
  initiatives?: Initiative[];
  errorText?: string;
}

/** Initiative detail — mock local store under MOCK_AUTH; live list lookup otherwise. */
export function InitiativeDetailPanel({
  initiativeId,
}: InitiativeDetailPanelProps): React.ReactElement {
  const { workspace } = useWorkspace();
  const { epics } = useEpicStore();
  const mock = isMockAuthEnabled();
  const [initiative, setInitiative] = React.useState<Initiative | null | undefined>(
    mock ? getInitiativeById(initiativeId) : undefined,
  );
  const [loading, setLoading] = React.useState(!mock);
  const [error, setError] = React.useState<string | null>(null);

  const reloadMock = React.useCallback((): void => {
    setInitiative(getInitiativeById(initiativeId) ?? null);
    setLoading(false);
  }, [initiativeId]);

  const reloadLive = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/initiatives?workspace_id=${encodeURIComponent(workspace.id)}`,
        { credentials: 'same-origin', cache: 'no-store' },
      );
      const payload = (await response.json()) as InitiativesListResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.errorText ?? `Failed to load initiative (${response.status})`);
      }
      const match = (payload.initiatives ?? []).find((row) => row.id === initiativeId) ?? null;
      setInitiative(match);
    } catch (err) {
      setInitiative(null);
      setError(err instanceof Error ? err.message : 'Failed to load initiative');
    } finally {
      setLoading(false);
    }
  }, [initiativeId, workspace.id]);

  React.useEffect(() => {
    if (mock) {
      reloadMock();
      return;
    }
    void reloadLive();
  }, [mock, reloadLive, reloadMock]);

  if (loading) {
    return (
      <p className="p-6 text-sm text-muted-foreground" data-testid="initiative-detail-loading">
        Loading initiative…
      </p>
    );
  }

  if (!initiative) {
    return (
      <div className="p-6" data-testid="initiative-detail-missing">
        <p className="text-sm text-muted-foreground">Initiative not found.</p>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  const linkedEpics = epics.filter((epic) => initiative.epic_ids.includes(epic.id));
  const unattached = epics.filter((epic) => !initiative.epic_ids.includes(epic.id));

  return (
    <div className="space-y-4 p-6" data-testid="initiative-detail-panel">
      <h1 className="text-lg font-semibold">{initiative.name}</h1>
      {initiative.description_md ? (
        <p className="text-sm text-muted-foreground">{initiative.description_md}</p>
      ) : null}

      <section data-testid="initiative-linked-epics">
        <h2 className="mb-2 text-sm font-semibold">Linked Epics</h2>
        {linkedEpics.length === 0 ? (
          <p className="text-sm text-muted-foreground">No epics linked yet.</p>
        ) : (
          <ul className="space-y-2">
            {linkedEpics.map((epic: Epic) => (
              <li key={epic.id} className="text-sm" data-testid="initiative-epic-row">
                {epic.name}
              </li>
            ))}
          </ul>
        )}
      </section>

      {mock && unattached.length > 0 ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          data-testid="initiative-attach-epic"
          onClick={() => {
            attachEpicToInitiative(initiativeId, unattached[0]!.id);
            reloadMock();
          }}
        >
          Attach {unattached[0]!.name}
        </Button>
      ) : null}
    </div>
  );
}
