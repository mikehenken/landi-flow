'use client';

import * as React from 'react';
import type { Epic } from '@landi-flow/core/types';
import { useEpicStore } from '@/hooks/use-epic-store';
import { listEpicDependencies } from '@/lib/milestones/epic-dependencies-store';

/** CAP-056 — roadmap timeline with dependency lines from DB/store. */
export function RoadmapTimelinePanel(): React.ReactElement {
  const { epics } = useEpicStore();

  const rows = epics.filter((epic) => epic.start_date || epic.target_date);

  return (
    <div className="p-6" data-testid="roadmap-timeline-panel" data-cap="CAP-056">
      <h1 className="text-lg font-semibold mb-4">Roadmap timeline</h1>
      <div className="relative space-y-4">
        {rows.map((epic) => {
          const deps = listEpicDependencies(epic.id);
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
              {deps.length > 0 ? (
                <ul className="mt-2 space-y-1" data-testid="roadmap-dependency-lines">
                  {deps.map((dep) => (
                    <li key={dep.id} className="text-xs text-primary font-mono">
                      {dep.relation_type}: {dep.target_epic_id}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
