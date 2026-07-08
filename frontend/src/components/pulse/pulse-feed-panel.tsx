'use client';

import * as React from 'react';
import type { PulseSchedule } from '@landi-flow/core/types';
import { Button } from '@landi-flow/ui';
import { useEpicStore } from '@/hooks/use-epic-store';
import {
  createPulseSchedule,
  listPulseSchedules,
  listPulseUpdates,
  runPulseSchedule,
} from '@/lib/pulse/pulse-store';

/** CAP-063–065 — Pulse feed, epic cards, schedule CRUD. */
export function PulseFeedPanel(): React.ReactElement {
  const { epics } = useEpicStore();
  const [updates, setUpdates] = React.useState(listPulseUpdates());
  const [schedules, setSchedules] = React.useState<PulseSchedule[]>([]);

  const reload = (): void => {
    setUpdates(listPulseUpdates());
    setSchedules(listPulseSchedules());
  };

  React.useEffect(() => {
    reload();
  }, []);

  return (
    <div className="p-6 space-y-6" data-testid="pulse-feed-panel">
      <header>
        <h1 className="text-lg font-semibold">Pulse</h1>
        <p className="text-sm text-muted-foreground">Product update feed (CAP-063).</p>
      </header>

      <section data-testid="pulse-updates-list" data-cap="CAP-063">
        {updates.map((update) => {
          const epic = epics.find((row) => row.id === update.epic_id);
          return (
            <article
              key={update.id}
              className="mb-3 rounded-md border border-border p-4"
              data-testid="pulse-epic-card"
              data-cap="CAP-064"
            >
              <h2 className="text-sm font-semibold">{update.title}</h2>
              {epic ? (
                <p className="text-xs text-primary mt-1">Epic: {epic.name}</p>
              ) : null}
              <p className="text-sm text-muted-foreground mt-2">{update.body_md}</p>
            </article>
          );
        })}
      </section>

      <section data-testid="pulse-schedules-panel" data-cap="CAP-065">
        <h2 className="text-sm font-semibold mb-2">Schedules</h2>
        <ul className="space-y-2 mb-3">
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
            </li>
          ))}
        </ul>
        <Button
          type="button"
          size="sm"
          data-testid="pulse-schedule-create"
          onClick={() => {
            createPulseSchedule('Daily digest', 'daily');
            reload();
          }}
        >
          Add schedule
        </Button>
      </section>
    </div>
  );
}
