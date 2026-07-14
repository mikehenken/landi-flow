'use client';

import { AppShell } from '@/components/app-shell';
import { InitiativesPanel } from '@/components/initiatives/initiatives-panel';

export default function InitiativesPage(): React.ReactElement {
  return (
    <AppShell viewTitle="Initiatives" breadcrumbs={['Workspace', 'Initiatives']}>
      <InitiativesPanel />
    </AppShell>
  );
}
