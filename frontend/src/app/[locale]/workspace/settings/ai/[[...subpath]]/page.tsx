'use client';

import * as React from 'react';
import { SettingsAiPage } from '@/components/settings/settings-segment-page';

interface PageProps {
  params: Promise<{ subpath?: string[] }>;
}

export default function WorkspaceSettingsAiRoute({ params }: PageProps): React.ReactElement {
  const [subpath, setSubpath] = React.useState<string[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    void params.then(({ subpath: resolved }) => {
      setSubpath(resolved ?? []);
      setReady(true);
    });
  }, [params]);

  if (!ready) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return <SettingsAiPage subpath={subpath} />;
}
