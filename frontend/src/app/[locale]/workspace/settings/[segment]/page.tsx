'use client';

import * as React from 'react';
import { SettingsSegmentPage } from '@/components/settings/settings-segment-page';

interface PageProps {
  params: Promise<{ segment: string }>;
}

export default function WorkspaceSettingsSegmentRoute({
  params,
}: PageProps): React.ReactElement {
  const [segment, setSegment] = React.useState<string | null>(null);

  React.useEffect(() => {
    void params.then(({ segment: resolved }) => setSegment(resolved));
  }, [params]);

  if (!segment) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return <SettingsSegmentPage segment={segment} />;
}
