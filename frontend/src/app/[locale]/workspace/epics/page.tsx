'use client';

import * as React from 'react';
import { useTranslations } from '@landi-flow/ui';
import { AppShell } from '@/components/app-shell';
import { EpicBoardView } from '@/components/epic-board-view';
import { useOpenCreateEpicModal } from '@/components/create-story-modal';
import { useEpicStore } from '@/hooks/use-epic-store';
import { epicStore } from '@/stores/epic-store';

function EpicsPageBody(): React.ReactElement {
  const { epics, selectedEpicId } = useEpicStore();
  const openCreateEpic = useOpenCreateEpicModal();

  return (
    <EpicBoardView
      epics={epics}
      selectedEpicId={selectedEpicId}
      onEpicSelect={(id) => epicStore.selectEpic(id)}
      onCreateEpic={openCreateEpic}
    />
  );
}

export default function EpicsBoardPage(): React.ReactElement {
  const t = useTranslations('navigation');

  return (
    <AppShell
      viewTitle={t('epics.title')}
      breadcrumbs={[t('inbox.team_breadcrumb'), t('views.epics_section')]}
    >
      <EpicsPageBody />
    </AppShell>
  );
}
