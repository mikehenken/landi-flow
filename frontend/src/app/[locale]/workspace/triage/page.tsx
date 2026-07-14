'use client';

import * as React from 'react';
import { useRouter } from '@/i18n/navigation';
import { AppShell } from '@/components/app-shell';
import { useWorkspaceTeams } from '@/hooks/use-workspace-teams';
import { useWorkspace } from '@/lib/workspace';
import { isMockAuthEnabled } from '@/lib/api/config';
import { DEMO_TEAM_ID } from '@/lib/seed-data';
import { getDefaultTeamId } from '@/lib/api/workspace-context';
import {
  resolveTriageTeamId,
  triageHrefForTeam,
} from '@/lib/navigation/resolve-triage-team-id';

/**
 * Stable Triage entry — resolves the workspace default team and routes to
 * `/workspace/team/{teamId}/triage` (avoids broken `/workspace/team//triage` hrefs).
 */
export default function WorkspaceTriageRedirectPage(): React.ReactElement {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const { defaultTeamId, teams, loading } = useWorkspaceTeams(workspace.id);

  const teamId = React.useMemo(
    () =>
      resolveTriageTeamId({
        mockAuth: isMockAuthEnabled(),
        demoTeamId: DEMO_TEAM_ID,
        defaultTeamId,
        contextTeamId: getDefaultTeamId(),
        firstTeamId: teams[0]?.id ?? null,
      }),
    [defaultTeamId, teams],
  );

  React.useEffect(() => {
    if (!teamId) {
      return;
    }
    router.replace(triageHrefForTeam(teamId));
  }, [router, teamId]);

  return (
    <AppShell viewTitle="Triage" breadcrumbs={['Workspace', 'Triage']}>
      <div className="p-6 text-sm text-muted-foreground" data-testid="triage-redirect">
        {loading || !teamId
          ? 'Resolving team triage…'
          : 'Opening team triage…'}
      </div>
    </AppShell>
  );
}
