'use client';

import { AppShell } from '@/components/app-shell';
import { TriageInboxPanel } from '@/components/triage/triage-inbox-panel';
import { useDefaultTeamLabel } from '@/hooks/use-default-team-label';
import { useStoryStore } from '@/hooks/use-story-store';
import { useWorkspaceTeams } from '@/hooks/use-workspace-teams';
import { getDefaultTriageTeamId } from '@/lib/triage/triage-store';
import { useWorkspace } from '@/lib/workspace';
import { useParams } from 'next/navigation';

export default function TeamTriagePage(): React.ReactElement {
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId ?? getDefaultTriageTeamId();
  const { stories } = useStoryStore();
  const { workspace } = useWorkspace();
  const { teams } = useWorkspaceTeams(workspace.id);
  const fallbackLabel = useDefaultTeamLabel();
  const teamName = teams.find((team) => team.id === teamId)?.name?.trim() || fallbackLabel;

  return (
    <AppShell
      viewTitle="Triage"
      breadcrumbs={[teamName, 'Triage']}
    >
      <TriageInboxPanel teamId={teamId} stories={stories} />
    </AppShell>
  );
}
