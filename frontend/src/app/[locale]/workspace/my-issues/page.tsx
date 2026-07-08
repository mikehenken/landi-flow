'use client';

import { AppShell } from '@/components/app-shell';
import { MyIssuesTabs } from '@/components/navigation/my-issues-tabs';
import { useStoryStore } from '@/hooks/use-story-store';
import { useTranslations, useTerminology } from '@landi-flow/ui';

export default function MyIssuesPage(): React.ReactElement {
  const t = useTranslations('views');
  const { t: tEntity } = useTerminology();
  const { stories } = useStoryStore();

  return (
    <AppShell
      viewTitle={`My ${tEntity('entity.stories')}`}
      breadcrumbs={[t('workspace'), `My ${tEntity('entity.stories')}`]}
    >
      <MyIssuesTabs stories={stories} />
    </AppShell>
  );
}
