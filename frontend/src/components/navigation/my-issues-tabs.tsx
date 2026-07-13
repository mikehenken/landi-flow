'use client';

import * as React from 'react';
import type { Story } from '@landi-flow/core/types';
import { Button, cn } from '@landi-flow/ui';
import { StoryListView } from '@/components/story-list-view';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { useSelectedStoryId } from '@/hooks/use-selected-story-id';
import { useStoryModalSelect } from '@/lib/story/use-story-deep-link';
import {
  filterMyIssuesTab,
  type MyIssuesTab,
} from '@/lib/navigation/my-issues-queries';

const TABS: { id: MyIssuesTab; label: string }[] = [
  { id: 'assigned', label: 'Assigned' },
  { id: 'created', label: 'Created' },
  { id: 'subscribed', label: 'Subscribed' },
  { id: 'activity', label: 'Activity' },
];

export interface MyIssuesTabsProps {
  stories: Story[];
  className?: string;
}

/** My Issues with four distinct live-query tabs (session user identity). */
export function MyIssuesTabs({ stories, className }: MyIssuesTabsProps): React.ReactElement {
  const [activeTab, setActiveTab] = React.useState<MyIssuesTab>('assigned');
  const currentUserId = useCurrentUserId();
  const selectedStoryId = useSelectedStoryId();
  const handleStorySelect = useStoryModalSelect();
  const filtered = React.useMemo(
    () => filterMyIssuesTab(stories, activeTab, currentUserId),
    [stories, activeTab, currentUserId],
  );

  return (
    <div
      className={cn('flex h-full flex-col', className)}
      data-testid="my-issues-tabs"
      data-cap="CAP-036"
    >
      <div className="flex gap-1 border-b border-border px-6 pt-3" role="tablist">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            data-testid={`my-issues-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            <span className="ml-1.5 font-mono text-xs opacity-70">
              {filterMyIssuesTab(stories, tab.id, currentUserId).length}
            </span>
          </Button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto" role="tabpanel">
        <StoryListView
          stories={filtered}
          selectedStoryId={selectedStoryId}
          onStorySelect={handleStorySelect}
        />
      </div>
    </div>
  );
}
