'use client';

import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/app-shell';
import { MyIssuesTabs } from '@/components/navigation/my-issues-tabs';
import { useStoryStore } from '@/hooks/use-story-store';
import { useStoryDeepLink } from '@/lib/story/use-story-deep-link';
import { useTerminology } from '@landi-flow/ui';

export default function MyIssuesPage(): React.ReactElement {
  const tNav = useTranslations('navigation');
  const { t: tEntity } = useTerminology();
  const { stories } = useStoryStore();
  useStoryDeepLink();

  return (
    <AppShell
      viewTitle={`My ${tEntity('entity.stories')}`}
      breadcrumbs={[tNav('views.workspace'), `My ${tEntity('entity.stories')}`]}
    >
      <MyIssuesTabs stories={stories} />
    </AppShell>
  );
}
