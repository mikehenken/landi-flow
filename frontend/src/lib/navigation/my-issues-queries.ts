import type { Story } from '@landi-flow/core/types';
import { CURRENT_USER } from '@/lib/agent-roster';
import { deriveSeedActivity } from '@/lib/inbox/derive-inbox-seed';

export type MyIssuesTab = 'assigned' | 'created' | 'subscribed' | 'activity';

export function filterMyIssuesTab(stories: Story[], tab: MyIssuesTab): Story[] {
  const active = stories.filter((s) => !s.is_draft && s.archived_at === null);
  const activityStoryIds = new Set(
    deriveSeedActivity(stories).map((e) => e.story_id).filter((id): id is string => id !== null),
  );

  switch (tab) {
    case 'assigned':
      return active.filter((s) => s.assignee_id === CURRENT_USER.id);
    case 'created':
      return active.filter((s) => s.creator_id === CURRENT_USER.id);
    case 'subscribed':
      return active.filter((s) => s.follower_ids.includes(CURRENT_USER.id));
    case 'activity':
      return active.filter((s) => activityStoryIds.has(s.id));
    default:
      return active;
  }
}
