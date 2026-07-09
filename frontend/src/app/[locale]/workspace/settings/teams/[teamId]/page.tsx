'use client';

import * as React from 'react';
import { TeamSettingsPage } from '@/components/settings/settings-segment-page';

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default function WorkspaceTeamSettingsRoute({
  params,
}: PageProps): React.ReactElement {
  const [teamId, setTeamId] = React.useState<string | null>(null);

  React.useEffect(() => {
    void params.then(({ teamId: resolved }) => setTeamId(resolved));
  }, [params]);

  if (!teamId) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return <TeamSettingsPage teamId={teamId} />;
}
