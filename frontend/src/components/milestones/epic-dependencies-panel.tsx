'use client';

import * as React from 'react';
import type { Epic } from '@landi-flow/core/types';
import { Button, cn } from '@landi-flow/ui';
import {
  addEpicDependency,
  listEpicDependencies,
  removeEpicDependency,
  type EpicDependency,
} from '@/lib/milestones/epic-dependencies-store';

export interface EpicDependenciesPanelProps {
  epic: Epic;
  allEpics: Epic[];
  className?: string;
}

/** CAP-055: epic blocked-by / blocking dependency relations. */
export function EpicDependenciesPanel({
  epic,
  allEpics,
  className,
}: EpicDependenciesPanelProps): React.ReactElement {
  const [deps, setDeps] = React.useState<EpicDependency[]>(() => listEpicDependencies(epic.id));

  const refresh = (): void => {
    setDeps(listEpicDependencies(epic.id));
  };

  const epicNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const row of allEpics) {
      map.set(row.id, row.name);
    }
    return map;
  }, [allEpics]);

  const otherEpics = allEpics.filter((row) => row.id !== epic.id);

  const handleAddBlockedBy = (targetEpicId: string): void => {
    if (!targetEpicId) {
      return;
    }
    addEpicDependency(epic.id, targetEpicId, 'blocked_by');
    refresh();
  };

  return (
    <section
      className={cn('flex flex-col gap-4 p-6', className)}
      data-testid="epic-dependencies-panel"
      data-cap="CAP-055"
    >
      <header>
        <h2 className="text-base font-semibold">Dependencies</h2>
        <p className="text-sm text-muted-foreground">
          Epics that block or are blocked by {epic.name}.
        </p>
      </header>

      <ul className="flex flex-col gap-2" data-testid="epic-dependencies-list">
        {deps.length === 0 ? (
          <li className="text-sm text-muted-foreground">No dependencies yet.</li>
        ) : (
          deps.map((dep) => {
            const isSource = dep.source_epic_id === epic.id;
            const otherId = isSource ? dep.target_epic_id : dep.source_epic_id;
            const label =
              dep.relation_type === 'blocked_by'
                ? isSource
                  ? 'Blocked by'
                  : 'Blocks'
                : dep.relation_type;
            return (
              <li
                key={dep.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                data-testid="epic-dependency-item"
              >
                <span>
                  <span className="text-muted-foreground">{label}</span>{' '}
                  <span className="font-medium">{epicNameById.get(otherId) ?? otherId}</span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    removeEpicDependency(dep.id);
                    refresh();
                  }}
                >
                  Remove
                </Button>
              </li>
            );
          })
        )}
      </ul>

      <div className="flex items-center gap-2">
        <select
          className="rounded-md border border-border bg-transparent px-2 py-1.5 text-sm"
          data-testid="epic-dependency-add-select"
          defaultValue=""
          onChange={(event) => {
            handleAddBlockedBy(event.target.value);
            event.target.value = '';
          }}
        >
          <option value="" disabled>
            Add blocked by…
          </option>
          {otherEpics.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
