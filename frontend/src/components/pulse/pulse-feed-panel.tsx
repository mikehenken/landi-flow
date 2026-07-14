'use client';

import * as React from 'react';
import type { PulseSchedule } from '@landi-flow/core/types';
import { Button } from '@landi-flow/ui';
import { useEpicStore } from '@/hooks/use-epic-store';
import { isMockAuthEnabled } from '@/lib/api/config';
import {
  createPulseSchedule,
  listPulseSchedules,
  listPulseUpdates,
  runPulseSchedule,
} from '@/lib/pulse/pulse-store';
import { useWorkspace } from '@/lib/workspace';

/**
 * Pulse feed — mock seed under MOCK_AUTH only.
 * Live mode shows an honest empty state (no pulse API / no fake epic cards).
 */
export function PulseFeedPanel(): React.ReactElement {
  const { workspace } = useWorkspace();
  const { epics } = useEpicStore();
  const mock = isMockAuthEnabled();
  const [updates, setUpdates] = React.useState(() =>
    mock ? listPulseUpdates(workspace.id) : [],
  );
  const [schedules, setSchedules] = React.useState<PulseSchedule[]>(() =>
    mock ? listPulseSchedules(workspace.id) : [],
  );

  const reload = React.useCallback((): void => {
    if (!mock) {
      setUpdates([]);
      setSchedules([]);
      return;
    }
    setUpdates(listPulseUpdates(workspace.id));
    setSchedules(listPulseSchedules(workspace.id));
  }, [mock, workspace.id]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div className="space-y-6 p-6" data-testid="pulse-feed-panel">
      <header>
        <h1 className="text-lg font-semibold">Pulse</h1>
        <p className="text-sm text-muted-foreground">Product update feed for epic progress.</p>
      </header>

      <section data-testid="pulse-updates-list">
        {updates.length === 0 ? (
          <div
            className="rounded-md border border-dashed border-border px-4 py-10 text-center"
            data-testid="pulse-empty"
          >
            <p className="text-sm font-medium text-foreground">No pulse updates yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {mock
                ? 'Publish an update when an epic ships a milestone.'
                : 'Pulse publishing is not connected for this workspace yet.'}
            </p>
          </div>
        ) : (
          updates.map((update) => {
            const epic = epics.find((row) => row.id === update.epic_id);
            return (
              <article
                key={update.id}
                className="mb-3 rounded-md border border-border p-4"
                data-testid="pulse-epic-card"
              >
                <h2 className="text-sm font-semibold">{update.title}</h2>
                {epic ? (
                  <p className="mt-1 text-xs text-primary">Epic: {epic.name}</p>
                ) : null}
                <p className="mt-2 text-sm text-muted-foreground">{update.body_md}</p>
              </article>
            );
          })
        )}
      </section>

      <section data-testid="pulse-schedules-panel">
        <h2 className="mb-2 text-sm font-semibold">Schedules</h2>
        {schedules.length === 0 ? (
          <p className="mb-3 text-sm text-muted-foreground" data-testid="pulse-schedules-empty">
            {mock ? 'No schedules yet.' : 'Pulse schedules are not available in live mode yet.'}
          </p>
        ) : (
          <ul className="mb-3 space-y-2">
            {schedules.map((schedule) => (
              <li
                key={schedule.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                data-testid="pulse-schedule-row"
              >
                <span>
                  {schedule.label} · {schedule.cadence}
                  {schedule.last_run_at ? ` · last ${schedule.last_run_at}` : ''}
                </span>
                {mock ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    data-testid="pulse-schedule-run"
                    onClick={() => {
                      runPulseSchedule(schedule.id);
                      reload();
                    }}
                  >
                    Run
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {mock ? (
          <Button
            type="button"
            size="sm"
            data-testid="pulse-schedule-create"
            onClick={() => {
              createPulseSchedule('Daily digest', 'daily', workspace.id);
              reload();
            }}
          >
            Add schedule
          </Button>
        ) : null}
      </section>
    </div>
  );
}
