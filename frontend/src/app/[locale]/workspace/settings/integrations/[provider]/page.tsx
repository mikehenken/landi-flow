'use client';

import * as React from 'react';
import { SettingsIntegrationPage } from '@/components/settings/settings-segment-page';

interface PageProps {
  params: Promise<{ provider: string }>;
}

export default function WorkspaceSettingsIntegrationRoute({
  params,
}: PageProps): React.ReactElement {
  const [provider, setProvider] = React.useState<string | null>(null);

  React.useEffect(() => {
    void params.then(({ provider: resolved }) => setProvider(resolved));
  }, [params]);

  if (!provider) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return <SettingsIntegrationPage provider={provider} />;
}
