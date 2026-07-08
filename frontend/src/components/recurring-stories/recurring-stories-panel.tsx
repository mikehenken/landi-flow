'use client';

import * as React from 'react';
import type { RecurringStoryRule } from '@landi-flow/core/types';
import { Button, Input } from '@landi-flow/ui';
import { DEMO_TEAM_ID } from '@/lib/seed-data';
import {
  createRecurringRule,
  listRecurringRules,
  runRecurringRule,
  toggleRecurringRule,
} from '@/lib/recurring-stories/recurring-stories-store';

/** CAP-010 — recurring story spawn rules in team settings. */
export function RecurringStoriesPanel(): React.ReactElement {
  const [rules, setRules] = React.useState<RecurringStoryRule[]>([]);
  const [titleTemplate, setTitleTemplate] = React.useState('Sprint retro — {date}');
  const [lastSpawnProof, setLastSpawnProof] = React.useState<string | null>(null);

  const reload = React.useCallback(() => {
    setRules(listRecurringRules(DEMO_TEAM_ID));
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div data-testid="recurring-stories-panel" className="space-y-6 p-6">
      <header>
        <h1 className="text-lg font-semibold">Recurring stories</h1>
        <p className="text-sm text-muted-foreground">
          Team cadence automation — rules spawn Stories on schedule (CAP-010).
        </p>
      </header>

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
                onClick={() => {
                  toggleRecurringRule(rule.id, !rule.enabled);
                  reload();
                }}
              >
                {rule.enabled ? 'Disable' : 'Enable'}
              </Button>
              <Button
                type="button"
                size="sm"
                data-testid="recurring-rule-run"
                onClick={() => {
                  const result = runRecurringRule(rule.id);
                  if (result) {
                    setLastSpawnProof(result.storyId);
                  }
                  reload();
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
        <Button
          type="button"
          onClick={() => {
            createRecurringRule(DEMO_TEAM_ID, titleTemplate);
            reload();
          }}
        >
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
