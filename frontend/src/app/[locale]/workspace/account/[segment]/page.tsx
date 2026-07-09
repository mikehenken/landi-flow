'use client';

import * as React from 'react';
import { AccountSegmentPage } from '@/components/account/account-segment-page';

interface PageProps {
  params: Promise<{ segment: string }>;
}

export default function WorkspaceAccountSegmentRoute({
  params,
}: PageProps): React.ReactElement {
  const [segment, setSegment] = React.useState<string | null>(null);

  React.useEffect(() => {
    void params.then(({ segment: resolved }) => setSegment(resolved));
  }, [params]);

  if (!segment) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return <AccountSegmentPage segment={segment} />;
}
