'use client';

import { AppShell } from '@/components/app-shell';
import { MyIssuesTabs } from '@/components/navigation/my-issues-tabs';
import { useStoryStore } from '@/hooks/use-story-store';
import { useTerminology } from '@landi-flow/ui';

export default function MyIssuesPage(): React.ReactElement {
  const tNav = useTranslations('navigation');
  const { t: tEntity } = useTerminology();
  const { stories } = useStoryStore();

  return (
    <AppShell
      viewTitle={`My ${tEntity('entity.stories')}`}
      breadcrumbs={[tNav('views.workspace'), `My ${tEntity('entity.stories')}`]}
    >
      <MyIssuesTabs stories={stories} />
    </AppShell>
  );
}
