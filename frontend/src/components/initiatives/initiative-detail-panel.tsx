'use client';

import * as React from 'react';
import type { Epic } from '@landi-flow/core/types';
import { Button } from '@landi-flow/ui';
import { attachEpicToInitiative, getInitiativeById } from '@/lib/initiatives/initiatives-store';
import { useEpicStore } from '@/hooks/use-epic-store';

export interface InitiativeDetailPanelProps {
  initiativeId: string;
}

/** CAP-060 — attach epics to initiatives. */
export function InitiativeDetailPanel({
  initiativeId,
}: InitiativeDetailPanelProps): React.ReactElement {
  const { epics } = useEpicStore();
  const [initiative, setInitiative] = React.useState(() => getInitiativeById(initiativeId));

  const reload = (): void => {
    setInitiative(getInitiativeById(initiativeId));
  };

  React.useEffect(() => {
    reload();
  }, [initiativeId]);

  if (!initiative) {
    return <p className="p-6 text-sm text-muted-foreground">Initiative not found.</p>;
  }

  const linkedEpics = epics.filter((epic) => initiative.epic_ids.includes(epic.id));
  const unattached = epics.filter((epic) => !initiative.epic_ids.includes(epic.id));

  return (
    <div className="p-6 space-y-4" data-testid="initiative-detail-panel" data-cap="CAP-060">
      <h1 className="text-lg font-semibold">{initiative.name}</h1>
      <p className="text-sm text-muted-foreground">{initiative.description_md}</p>

      <section data-testid="initiative-linked-epics">
        <h2 className="text-sm font-semibold mb-2">Linked Epics</h2>
        <ul className="space-y-2">
          {linkedEpics.map((epic: Epic) => (
            <li key={epic.id} className="text-sm" data-testid="initiative-epic-row">
              {epic.name}
            </li>
          ))}
        </ul>
      </section>

      {unattached.length > 0 ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          data-testid="initiative-attach-epic"
          onClick={() => {
            attachEpicToInitiative(initiativeId, unattached[0]!.id);
            reload();
          }}
        >
          Attach {unattached[0]!.name}
        </Button>
      ) : null}
    </div>
  );
}
