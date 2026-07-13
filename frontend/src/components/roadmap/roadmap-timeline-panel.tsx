'use client';

import * as React from 'react';
import { useEpicStore } from '@/hooks/use-epic-store';
import { listEpicDependencies } from '@/lib/milestones/epic-dependencies-store';

/**
 * Roadmap timeline from live epic dates.
 * Empty until epics have start_date or target_date — no demo bars.
 */
export function RoadmapTimelinePanel(): React.ReactElement {
  const { epics, loading } = useEpicStore();

  const rows = epics.filter((epic) => epic.start_date || epic.target_date);

  return (
    <div className="p-6" data-testid="roadmap-timeline-panel">
      <h1 className="mb-4 text-lg font-semibold">Roadmap timeline</h1>
      {loading ? (
        <p className="text-sm text-muted-foreground" data-testid="roadmap-loading">
          Loading roadmap…
        </p>
      ) : rows.length === 0 ? (
        <div
          className="rounded-md border border-dashed border-border px-4 py-10 text-center"
          data-testid="roadmap-empty"
        >
          <p className="text-sm font-medium text-foreground">No roadmap items yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a start or target date to an epic to place it on the roadmap.
          </p>
        </div>
      ) : (
        <div className="relative space-y-4">
          {rows.map((epic) => {
            const deps = listEpicDependencies(epic.id);
            const namedDeps = deps.filter((dep) => {
              const target = epics.find((row) => row.id === dep.target_epic_id);
              return target !== undefined;
            });
            return (
              <div
                key={epic.id}
                className="relative rounded-md border border-border p-4"
                data-testid="roadmap-epic-bar"
              >
                <p className="text-sm font-medium">{epic.name}</p>
                <p className="text-xs text-muted-foreground">
                  {epic.start_date ?? '—'} → {epic.target_date ?? '—'}
                </p>
                {namedDeps.length > 0 ? (
                  <ul className="mt-2 space-y-1" data-testid="roadmap-dependency-lines">
                    {namedDeps.map((dep) => {
                      const target = epics.find((row) => row.id === dep.target_epic_id);
                      return (
                        <li key={dep.id} className="text-xs text-muted-foreground">
                          {dep.relation_type}: {target?.name ?? 'Linked epic'}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
