'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { EpicBoardView } from '@/components/epic-board-view';
import { useEpicStore } from '@/hooks/use-epic-store';
import { epicStore } from '@/stores/epic-store';

export default function EpicsBoardPage(): React.ReactElement {
  const { epics, selectedEpicId } = useEpicStore();

  return (
    <AppShell viewTitle="Epic Board" breadcrumbs={['Team Design', 'Epics']}>
      <EpicBoardView
        epics={epics}
        selectedEpicId={selectedEpicId}
        onEpicSelect={(id) => epicStore.selectEpic(id)}
        onCreateEpic={() => epicStore.selectEpic(null)}
      />
    </AppShell>
  );
}
