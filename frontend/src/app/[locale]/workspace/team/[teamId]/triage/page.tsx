'use client';

import { AppShell } from '@/components/app-shell';
import { TriageInboxPanel } from '@/components/triage/triage-inbox-panel';
import { useStoryStore } from '@/hooks/use-story-store';
import { getDefaultTriageTeamId } from '@/lib/triage/triage-store';
import { useParams } from 'next/navigation';

export default function TeamTriagePage(): React.ReactElement {
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId ?? getDefaultTriageTeamId();
  const { stories } = useStoryStore();

  return (
    <AppShell
      viewTitle="Triage"
      breadcrumbs={['Team Design', 'Triage']}
    >
      <TriageInboxPanel teamId={teamId} stories={stories} />
    </AppShell>
  );
}
