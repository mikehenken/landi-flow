'use client';

import { useParams } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { InitiativeDetailPanel } from '@/components/initiatives/initiative-detail-panel';

export default function InitiativeDetailPage(): React.ReactElement {
  const params = useParams<{ initiativeId: string }>();
  const initiativeId = params.initiativeId;

  return (
    <AppShell viewTitle="Initiative" breadcrumbs={['Workspace', 'Initiatives', initiativeId]}>
      <InitiativeDetailPanel initiativeId={initiativeId} />
    </AppShell>
  );
}
