'use client';

import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/app-shell';
import { MyIssuesTabs } from '@/components/navigation/my-issues-tabs';
import { StoryDetailSurface } from '@/components/story-detail-panel';
import { useSelectedStoryId } from '@/hooks/use-selected-story-id';
import { useStoryStore } from '@/hooks/use-story-store';
import { useStoryDeepLink } from '@/lib/story/use-story-deep-link';
import { storyStore } from '@/stores/story-store';
import { useTerminology } from '@landi-flow/ui';

export default function MyIssuesPage(): React.ReactElement {
  const tNav = useTranslations('navigation');
  const { t: tEntity } = useTerminology();
  const { stories } = useStoryStore();
  const selectedStoryId = useSelectedStoryId();
  useStoryDeepLink();
  const selectedStory =
    stories.find((story) => story.id === selectedStoryId || story.identifier === selectedStoryId) ??
    storyStore
      .getServerSnapshot()
      .stories.find(
        (story) => story.id === selectedStoryId || story.identifier === selectedStoryId,
      ) ??
    null;

  return (
    <AppShell
      viewTitle={`My ${tEntity('entity.stories')}`}
      breadcrumbs={[tNav('views.workspace'), `My ${tEntity('entity.stories')}`]}
    >
      <div className="flex h-full flex-col lg:flex-row">
        <div className="min-h-0 flex-1 overflow-hidden">
          <MyIssuesTabs stories={stories} />
        </div>
        <StoryDetailSurface
          story={selectedStory}
          onClose={() => storyStore.selectStory(null)}
        />
      </div>
    </AppShell>
  );
}
