'use client';

import * as React from 'react';
import type { Cycle } from '@landi-flow/core/types';
import { Button, cn, Input } from '@landi-flow/ui';
import { DEMO_TEAM_ID } from '@/lib/seed-data';
import {
  completeCycle,
  createCycle,
  listCyclesForTeam,
  readCycleAutomation,
  runCycleAutomation,
  writeCycleAutomation,
  type CycleAutomationSettings,
} from '@/lib/cycles/cycle-store';

export interface CyclesPanelProps {
  teamId?: string;
  className?: string;
}

/** CAP-061/062: team cycles CRUD + automation settings. */
export function CyclesPanel({
  teamId = DEMO_TEAM_ID,
  className,
}: CyclesPanelProps): React.ReactElement {
  const [cycles, setCycles] = React.useState<Cycle[]>(() => listCyclesForTeam(teamId));
  const [automation, setAutomation] = React.useState<CycleAutomationSettings>(() =>
    readCycleAutomation(teamId),
  );
  const [newName, setNewName] = React.useState('');

  const refresh = (): void => {
    setCycles(listCyclesForTeam(teamId));
    setAutomation(readCycleAutomation(teamId));
  };

  const handleCreate = (): void => {
    const trimmed = newName.trim();
    if (!trimmed) {
      return;
    }
    const now = new Date();
    const ends = new Date(now);
    ends.setDate(ends.getDate() + 14);
    createCycle(teamId, trimmed, now.toISOString(), ends.toISOString());
    setNewName('');
    refresh();
  };

  const handleComplete = (cycleId: string): void => {
    completeCycle(cycleId);
    refresh();
  };

  const handleRunAutomation = (): void => {
    runCycleAutomation(teamId);
    refresh();
  };

  const toggleAutoAdd = (): void => {
    const next = { ...automation, auto_add_stories: !automation.auto_add_stories };
    writeCycleAutomation(next);
    setAutomation(next);
  };

  const toggleRollover = (): void => {
    const next = { ...automation, rollover_incomplete: !automation.rollover_incomplete };
    writeCycleAutomation(next);
    setAutomation(next);
  };

  return (
    <section
      className={cn('flex flex-col gap-6 p-6', className)}
      data-testid="cycles-panel"
      data-cap="CAP-061"
    >
      <header>
        <h2 className="text-lg font-semibold">Cycles</h2>
        <p className="text-sm text-muted-foreground">Sprint containers for Team Design.</p>
      </header>

      <ul className="flex flex-col gap-2" data-testid="cycles-list">
        {cycles.map((cycle) => (
          <li
            key={cycle.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3"
            data-testid="cycle-item"
          >
            <div>
              <p className="font-medium">
                {cycle.name} <span className="font-mono text-xs text-muted-foreground">#{cycle.number}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {cycle.completed_at ? 'Completed' : 'Active'}
              </p>
            </div>
            {!cycle.completed_at ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid="cycle-complete"
                onClick={() => handleComplete(cycle.id)}
              >
                Complete
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New cycle name"
          data-testid="cycle-create-input"
          className="h-8 max-w-xs text-sm"
        />
        <Button type="button" size="sm" data-testid="cycle-create" onClick={handleCreate}>
          Create cycle
        </Button>
      </div>

      <section
        className="rounded-lg border border-border p-4"
        data-testid="cycle-automation-panel"
        data-cap="CAP-062"
      >
        <h3 className="text-sm font-semibold">Cycle automation</h3>
        <div className="mt-3 flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={automation.auto_add_stories}
              data-testid="cycle-auto-add"
              onChange={toggleAutoAdd}
            />
            Auto-add new Stories to active cycle
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={automation.rollover_incomplete}
              data-testid="cycle-rollover"
              onChange={toggleRollover}
            />
            Rollover incomplete Stories on cycle complete
          </label>
          <p className="text-xs text-muted-foreground">
            Last run: {automation.last_run_at ?? 'Never'}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="cycle-automation-run"
            onClick={handleRunAutomation}
          >
            Run automation now
          </Button>
        </div>
      </section>
    </section>
  );
}
