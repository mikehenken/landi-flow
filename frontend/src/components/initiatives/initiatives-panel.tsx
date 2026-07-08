'use client';

import * as React from 'react';
import type { Initiative } from '@landi-flow/core/types';
import { Button } from '@landi-flow/ui';
import { Link } from '@/i18n/navigation';
import {
  createInitiative,
  listInitiatives,
  readInitiativeSettings,
  writeInitiativeSettings,
} from '@/lib/initiatives/initiatives-store';

/** CAP-058/059 — initiatives list + enable toggle. */
export function InitiativesPanel(): React.ReactElement {
  const [initiatives, setInitiatives] = React.useState<Initiative[]>([]);
  const [settings, setSettings] = React.useState(readInitiativeSettings());

  const reload = (): void => {
    setInitiatives(listInitiatives());
    setSettings(readInitiativeSettings());
  };

  React.useEffect(() => {
    reload();
  }, []);

  if (!settings.enabled) {
    return (
      <div className="p-6" data-testid="initiatives-disabled">
        <p className="text-sm text-muted-foreground mb-4">Initiatives are disabled for this workspace.</p>
        <Button
          type="button"
          onClick={() => {
            writeInitiativeSettings({ ...settings, enabled: true, updated_at: new Date().toISOString() });
            reload();
          }}
          data-testid="initiatives-enable"
        >
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

  return (
    <div className="p-6 space-y-6" data-testid="initiatives-panel" data-cap="CAP-059">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Initiatives</h1>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            createInitiative('New initiative');
            reload();
          }}
          data-testid="initiative-create"
        >
          New initiative
        </Button>
      </header>

      {(['active', 'planned', 'completed'] as const).map((status) => (
        <section key={status} data-testid={`initiatives-group-${status}`}>
          <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2">{status}</h2>
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
        </section>
      ))}
    </div>
  );
}
