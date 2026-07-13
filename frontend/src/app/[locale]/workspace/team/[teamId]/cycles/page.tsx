'use client';

import { AppShell } from '@/components/app-shell';
import { CyclesPanel } from '@/components/cycles/cycles-panel';
import { useDefaultTeamLabel } from '@/hooks/use-default-team-label';
import { useWorkspaceTeams } from '@/hooks/use-workspace-teams';
import { getDefaultTriageTeamId } from '@/lib/triage/triage-store';
import { useWorkspace } from '@/lib/workspace';
import { useParams } from 'next/navigation';

export default function TeamCyclesPage(): React.ReactElement {
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId ?? getDefaultTriageTeamId();
  const { workspace } = useWorkspace();
  const { teams } = useWorkspaceTeams(workspace.id);
  const fallbackLabel = useDefaultTeamLabel();
  const teamName = teams.find((team) => team.id === teamId)?.name?.trim() || fallbackLabel;

  return (
    <AppShell viewTitle="Cycles" breadcrumbs={[teamName, 'Cycles']}>
      <CyclesPanel teamId={teamId} />
    </AppShell>
  );
}
