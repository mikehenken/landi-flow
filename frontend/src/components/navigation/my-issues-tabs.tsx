'use client';

import * as React from 'react';
import type { Story } from '@landi-flow/core/types';
import { Button, cn } from '@landi-flow/ui';
import { StoryListView } from '@/components/story-list-view';
import { storyStore } from '@/stores/story-store';
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

/** CAP-036: My Issues with four distinct live-query tabs. */
export function MyIssuesTabs({ stories, className }: MyIssuesTabsProps): React.ReactElement {
  const [activeTab, setActiveTab] = React.useState<MyIssuesTab>('assigned');
  const filtered = React.useMemo(
    () => filterMyIssuesTab(stories, activeTab),
    [stories, activeTab],
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
              {filterMyIssuesTab(stories, tab.id).length}
            </span>
          </Button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto" role="tabpanel">
        <StoryListView
          stories={filtered}
          selectedStoryId={null}
          onStorySelect={(id) => storyStore.selectStory(id)}
        />
      </div>
    </div>
  );
}
