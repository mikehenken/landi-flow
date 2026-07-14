'use client';

import * as React from 'react';
import type { Cycle } from '@landi-flow/core/types';
import { Button, cn, Input } from '@landi-flow/ui';
import {
  completeCycle,
  createCycle,
  executeCycleAutomation,
  loadCycleAutomation,
  saveCycleAutomation,
  type CycleAutomationSettings,
} from '@/controllers/cycles-controller';
import { TeamSelector } from '@/components/settings/team-selector';
import { useTeamCycles } from '@/hooks/use-team-cycles';
import { useWorkspaceTeams } from '@/hooks/use-workspace-teams';
import { useWorkspace } from '@/lib/workspace';

export interface CyclesPanelProps {
  teamId?: string;
  className?: string;
}

/** Team cycles CRUD + automation settings. */
export function CyclesPanel({ teamId: initialTeamId, className }: CyclesPanelProps): React.ReactElement {
  const { workspace } = useWorkspace();
  const { teams, loading: teamsLoading, defaultTeamId } = useWorkspaceTeams(workspace.id);
  const [teamId, setTeamId] = React.useState<string | null>(initialTeamId ?? null);
  const resolvedTeamId = teamId ?? defaultTeamId;
  const { cycles, refresh: refreshCycles } = useTeamCycles(workspace.id, resolvedTeamId);
  const [automation, setAutomation] = React.useState<CycleAutomationSettings | null>(null);
  const [newName, setNewName] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!teamId && defaultTeamId) {
      setTeamId(defaultTeamId);
    }
  }, [teamId, defaultTeamId]);

  React.useEffect(() => {
    if (!resolvedTeamId) {
      setAutomation(null);
      return;
    }
    setAutomation(loadCycleAutomation(resolvedTeamId));
  }, [resolvedTeamId]);

  const handleCreate = React.useCallback(async (): Promise<void> => {
    const trimmed = newName.trim();
    if (!trimmed || !resolvedTeamId) {
      return;
    }
    const now = new Date();
    const ends = new Date(now);
    ends.setDate(ends.getDate() + 14);
    setBusy(true);
    setError(null);
    try {
      await createCycle({
        workspaceId: workspace.id,
        teamId: resolvedTeamId,
        name: trimmed,
        startsAt: now.toISOString(),
        endsAt: ends.toISOString(),
      });
      setNewName('');
      refreshCycles();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create cycle');
    } finally {
      setBusy(false);
    }
  }, [newName, resolvedTeamId, workspace.id, refreshCycles]);

  const handleComplete = React.useCallback(
    async (cycle: Cycle): Promise<void> => {
      if (!resolvedTeamId) {
        return;
      }
      setBusy(true);
      setError(null);
      try {
        await completeCycle({
          workspaceId: workspace.id,
          teamId: resolvedTeamId,
          cycleId: cycle.id,
        });
        refreshCycles();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to complete cycle');
      } finally {
        setBusy(false);
      }
    },
    [resolvedTeamId, workspace.id, refreshCycles],
  );

  const handleRunAutomation = React.useCallback((): void => {
    if (!resolvedTeamId) {
      return;
    }
    const updated = executeCycleAutomation(resolvedTeamId);
    setAutomation(updated);
  }, [resolvedTeamId]);

  const toggleAutoAdd = React.useCallback((): void => {
    if (!automation) {
      return;
    }
    const next = { ...automation, auto_add_stories: !automation.auto_add_stories };
    saveCycleAutomation(next);
    setAutomation(next);
  }, [automation]);

  const toggleRollover = React.useCallback((): void => {
    if (!automation) {
      return;
    }
    const next = { ...automation, rollover_incomplete: !automation.rollover_incomplete };
    saveCycleAutomation(next);
    setAutomation(next);
  }, [automation]);

  return (
    <section
      className={cn('flex flex-col gap-6 p-6', className)}
      data-testid="cycles-panel"
      data-cap="CAP-061"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Cycles</h2>
          <p className="text-sm text-muted-foreground">Sprint containers scoped per team.</p>
        </div>
        <TeamSelector
          teams={teams}
          teamId={resolvedTeamId}
          onTeamIdChange={setTeamId}
          loading={teamsLoading}
        />
      </header>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <ul className="flex flex-col gap-2" data-testid="cycles-list">
        {cycles.map((cycle) => (
          <li
            key={cycle.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3"
            data-testid="cycle-item"
          >
            <div>
              <p className="font-medium">
                {cycle.name}{' '}
                <span className="font-mono text-xs text-muted-foreground">#{cycle.number}</span>
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
                disabled={busy}
                data-testid="cycle-complete"
                onClick={() => void handleComplete(cycle)}
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
        <Button
          type="button"
          size="sm"
          disabled={busy || !resolvedTeamId}
          data-testid="cycle-create"
          onClick={() => void handleCreate()}
        >
          Create cycle
        </Button>
      </div>

      {automation ? (
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
      ) : null}
    </section>
  );
}
