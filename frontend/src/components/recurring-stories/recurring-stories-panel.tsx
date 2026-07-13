'use client';

import * as React from 'react';
import type { RecurringStoryRule } from '@landi-flow/core/types';
import { Button, Input } from '@landi-flow/ui';
import {
  createRecurringRule,
  loadRecurringRules,
  runRecurringRule,
  toggleRecurringRule,
} from '@/controllers/recurring-rules-controller';
import { TeamSelector } from '@/components/settings/team-selector';
import { useWorkspaceTeams } from '@/hooks/use-workspace-teams';
import { useWorkspace } from '@/lib/workspace';

/** Recurring story spawn rules in team settings. */
export function RecurringStoriesPanel(): React.ReactElement {
  const { workspace } = useWorkspace();
  const { teams, loading: teamsLoading, defaultTeamId } = useWorkspaceTeams(workspace.id);
  const [teamId, setTeamId] = React.useState<string | null>(null);
  const resolvedTeamId = teamId ?? defaultTeamId;
  const [rules, setRules] = React.useState<RecurringStoryRule[]>([]);
  const [titleTemplate, setTitleTemplate] = React.useState('Sprint retro — {date}');
  const [lastSpawnProof, setLastSpawnProof] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!teamId && defaultTeamId) {
      setTeamId(defaultTeamId);
    }
  }, [teamId, defaultTeamId]);

  const reload = React.useCallback(() => {
    if (!resolvedTeamId) {
      setRules([]);
      return;
    }
    setError(null);
    void loadRecurringRules(resolvedTeamId)
      .then(setRules)
      .catch((err: unknown) => {
        setRules([]);
        setError(err instanceof Error ? err.message : 'Failed to load recurring rules');
      });
  }, [resolvedTeamId]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const handleCreate = React.useCallback(async (): Promise<void> => {
    if (!resolvedTeamId || !titleTemplate.trim()) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createRecurringRule({
        workspaceId: workspace.id,
        teamId: resolvedTeamId,
        titleTemplate: titleTemplate.trim(),
      });
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create rule');
    } finally {
      setBusy(false);
    }
  }, [resolvedTeamId, titleTemplate, workspace.id, reload]);

  return (
    <div data-testid="recurring-stories-panel" className="space-y-6 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Recurring stories</h1>
          <p className="text-sm text-muted-foreground">
            Team cadence automation — rules spawn Stories on schedule.
          </p>
        </div>
        <TeamSelector
          teams={teams}
          teamId={resolvedTeamId}
          onTeamIdChange={setTeamId}
          loading={teamsLoading}
        />
      </header>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section data-testid="recurring-rules-list" className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
            data-testid="recurring-rule-row"
          >
            <div>
              <p className="text-sm font-medium">{rule.title_template}</p>
              <p className="text-xs text-muted-foreground">
                {rule.cadence} · spawned {rule.spawn_count} ·{' '}
                {rule.last_spawn_at ? `last ${rule.last_spawn_at}` : 'never run'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void toggleRecurringRule(rule.id, !rule.enabled)
                    .then(() => reload())
                    .catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : 'Failed to toggle rule');
                    })
                    .finally(() => setBusy(false));
                }}
              >
                {rule.enabled ? 'Disable' : 'Enable'}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                data-testid="recurring-rule-run"
                onClick={() => {
                  setBusy(true);
                  setError(null);
                  void runRecurringRule({ workspaceId: workspace.id, rule })
                    .then((result) => {
                      setLastSpawnProof(result.storyId);
                      reload();
                    })
                    .catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : 'Failed to run rule');
                    })
                    .finally(() => setBusy(false));
                }}
              >
                Run now
              </Button>
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-wrap gap-2" data-testid="recurring-rule-create">
        <Input
          value={titleTemplate}
          onChange={(event) => setTitleTemplate(event.target.value)}
          placeholder="Title template with {date}"
          className="max-w-md"
        />
        <Button type="button" disabled={busy || !resolvedTeamId} onClick={() => void handleCreate()}>
          Add rule
        </Button>
      </section>

      {lastSpawnProof ? (
        <p className="text-xs font-mono text-primary" data-testid="recurring-spawn-proof">
          Spawned story: {lastSpawnProof}
        </p>
      ) : null}
    </div>
  );
}
