'use client';

import { AppShell } from '@/components/app-shell';
import { RoadmapTimelinePanel } from '@/components/roadmap/roadmap-timeline-panel';

export default function RoadmapPage(): React.ReactElement {
  return (
    <AppShell viewTitle="Roadmap" breadcrumbs={['Workspace', 'Roadmap']}>
      <RoadmapTimelinePanel />
    </AppShell>
  );
}
