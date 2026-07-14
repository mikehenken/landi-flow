'use client';

import * as React from 'react';
import { useTranslations } from '@landi-flow/ui';
import { AppShell } from '@/components/app-shell';
import { EpicBoardView } from '@/components/epic-board-view';
import { useOpenCreateEpicModal } from '@/components/create-story-modal';
import { useEpicStore } from '@/hooks/use-epic-store';
import { epicStore } from '@/stores/epic-store';
import { useRouter } from '@/i18n/navigation';

function EpicsPageBody(): React.ReactElement {
  const { epics, selectedEpicId } = useEpicStore();
  const openCreateEpic = useOpenCreateEpicModal();
  const router = useRouter();

  const handleEpicSelect = React.useCallback(
    (epicId: string) => {
      epicStore.selectEpic(epicId);
      router.push(`/workspace/epics/${epicId}`);
    },
    [router],
  );

  return (
    <EpicBoardView
      epics={epics}
      selectedEpicId={selectedEpicId}
      onEpicSelect={handleEpicSelect}
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
