'use client';

import { AppShell } from '@/components/app-shell';
import { CyclesPanel } from '@/components/cycles/cycles-panel';
import { getDefaultTriageTeamId } from '@/lib/triage/triage-store';
import { useParams } from 'next/navigation';

export default function TeamCyclesPage(): React.ReactElement {
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId ?? getDefaultTriageTeamId();

  return (
    <AppShell viewTitle="Cycles" breadcrumbs={['Team Design', 'Cycles']}>
      <CyclesPanel teamId={teamId} />
    </AppShell>
  );
}
