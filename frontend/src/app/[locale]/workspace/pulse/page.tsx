'use client';

import { AppShell } from '@/components/app-shell';
import { PulseFeedPanel } from '@/components/pulse/pulse-feed-panel';

export default function PulsePage(): React.ReactElement {
  return (
    <AppShell viewTitle="Pulse" breadcrumbs={['Workspace', 'Pulse']}>
      <PulseFeedPanel />
    </AppShell>
  );
}
