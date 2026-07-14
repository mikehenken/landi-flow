'use client';

import * as React from 'react';
import type { Initiative, InitiativeSettings } from '@landi-flow/core/types';
import { Button } from '@landi-flow/ui';
import { Link } from '@/i18n/navigation';
import { isMockAuthEnabled } from '@/lib/api/config';
import {
  createInitiative,
  listInitiatives,
  readInitiativeSettings,
  writeInitiativeSettings,
} from '@/lib/initiatives/initiatives-store';
import { useWorkspace } from '@/lib/workspace';

interface InitiativesListResponse {
  ok: boolean;
  initiatives?: Initiative[];
  settings?: InitiativeSettings;
  errorText?: string;
  schemaPending?: boolean;
  hint?: string;
}

interface CreateInitiativeResponse {
  ok: boolean;
  initiative?: Initiative;
  errorText?: string;
  schemaPending?: boolean;
  hint?: string;
}

interface PatchSettingsResponse {
  ok: boolean;
  settings?: InitiativeSettings;
  errorText?: string;
  schemaPending?: boolean;
  hint?: string;
}

/** Initiatives list — live API when authenticated; mock seed only under MOCK_AUTH. */
export function InitiativesPanel(): React.ReactElement {
  const { workspace } = useWorkspace();
  const mock = isMockAuthEnabled();
  const [initiatives, setInitiatives] = React.useState<Initiative[]>([]);
  const [settings, setSettings] = React.useState<InitiativeSettings>(() =>
    readInitiativeSettings(workspace.id),
  );
  const [loading, setLoading] = React.useState(!mock);
  const [error, setError] = React.useState<string | null>(null);
  const [schemaHint, setSchemaHint] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  const reloadMock = React.useCallback((): void => {
    setInitiatives(listInitiatives(workspace.id));
    setSettings(readInitiativeSettings(workspace.id));
    setLoading(false);
    setError(null);
  }, [workspace.id]);

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
        throw new Error(payload.errorText ?? `Failed to load initiatives (${response.status})`);
      }
      setInitiatives(payload.initiatives ?? []);
      setSchemaHint(payload.schemaPending ? (payload.hint ?? null) : null);
      setSettings(
        payload.settings ?? {
          workspace_id: workspace.id,
          enabled: false,
          schedule_cadence: 'weekly',
          updated_at: new Date().toISOString(),
        },
      );
    } catch (err) {
      setInitiatives([]);
      setSchemaHint(null);
      setError(err instanceof Error ? err.message : 'Failed to load initiatives');
    } finally {
      setLoading(false);
    }
  }, [workspace.id]);

  React.useEffect(() => {
    if (mock) {
      reloadMock();
      return;
    }
    void reloadLive();
  }, [mock, reloadLive, reloadMock]);

  const handleEnable = React.useCallback(async (): Promise<void> => {
    if (mock) {
      writeInitiativeSettings({
        ...settings,
        enabled: true,
        updated_at: new Date().toISOString(),
      });
      reloadMock();
      return;
    }
    setError(null);
    try {
      const response = await fetch('/api/initiatives', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspace.id, enabled: true }),
      });
      const payload = (await response.json()) as PatchSettingsResponse;
      if (!response.ok || !payload.ok || !payload.settings) {
        throw new Error(payload.errorText ?? 'Failed to enable initiatives');
      }
      setSettings(payload.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable initiatives');
    }
  }, [mock, reloadMock, settings, workspace.id]);

  const handleCreate = React.useCallback(async (): Promise<void> => {
    setCreating(true);
    setError(null);
    try {
      if (mock) {
        createInitiative('New initiative', 'planned', workspace.id);
        reloadMock();
        return;
      }
      const response = await fetch('/api/initiatives', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspace.id, name: 'New initiative' }),
      });
      const payload = (await response.json()) as CreateInitiativeResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.errorText ?? 'Failed to create initiative');
      }
      await reloadLive();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create initiative');
    } finally {
      setCreating(false);
    }
  }, [mock, reloadLive, reloadMock, workspace.id]);

  if (loading) {
    return (
      <div className="p-6" data-testid="initiatives-loading">
        <p className="text-sm text-muted-foreground">Loading initiatives…</p>
      </div>
    );
  }

  if (!settings.enabled) {
    return (
      <div className="p-6" data-testid="initiatives-disabled">
        <p className="mb-4 text-sm text-muted-foreground">
          Initiatives are disabled for this workspace.
        </p>
        {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
        <Button type="button" onClick={() => void handleEnable()} data-testid="initiatives-enable">
          Enable initiatives
        </Button>
      </div>
    );
  }

  const grouped: Record<Initiative['status'], Initiative[]> = {
    active: [],
    planned: [],
    completed: [],
  };
  for (const row of initiatives) {
    grouped[row.status].push(row);
  }

  const total = initiatives.length;

  return (
    <div className="space-y-6 p-6" data-testid="initiatives-panel">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Initiatives</h1>
        <Button
          type="button"
          size="sm"
          disabled={creating}
          onClick={() => void handleCreate()}
          data-testid="initiative-create"
        >
          New initiative
        </Button>
      </header>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {schemaHint ? (
        <p className="text-sm text-amber-500" data-testid="initiatives-schema-hint">
          {schemaHint}
        </p>
      ) : null}

      {total === 0 ? (
        <div
          className="rounded-md border border-dashed border-border px-4 py-10 text-center"
          data-testid="initiatives-empty"
        >
          <p className="text-sm font-medium text-foreground">No initiatives yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create an initiative to group epics for portfolio planning.
          </p>
        </div>
      ) : (
        (['active', 'planned', 'completed'] as const).map((status) => (
          <section key={status} data-testid={`initiatives-group-${status}`}>
            <h2 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{status}</h2>
            {grouped[status].length === 0 ? (
              <p className="text-xs text-muted-foreground">None</p>
            ) : (
              <ul className="space-y-2">
                {grouped[status].map((initiative) => (
                  <li key={initiative.id}>
                    <Link
                      href={`/workspace/initiatives/${initiative.id}`}
                      className="block rounded-md border border-border px-3 py-2 text-sm hover:bg-white/5"
                      data-testid="initiative-row"
                    >
                      {initiative.name} · {initiative.epic_ids.length} epics
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))
      )}
    </div>
  );
}
