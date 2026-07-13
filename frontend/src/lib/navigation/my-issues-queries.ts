import type { Story } from '@landi-flow/core/types';
import { deriveSeedActivity } from '@/lib/inbox/derive-inbox-seed';

export type MyIssuesTab = 'assigned' | 'created' | 'subscribed' | 'activity';

/**
 * Filter stories for My Issues tabs using the authenticated user id.
 * Callers must pass session `user.id` (not the demo CURRENT_USER).
 */
export function filterMyIssuesTab(
  stories: Story[],
  tab: MyIssuesTab,
  currentUserId: string | null | undefined,
): Story[] {
  const active = stories.filter((s) => !s.is_draft && s.archived_at === null);
  if (!currentUserId) {
    return tab === 'activity' ? active.filter(() => false) : [];
  }

  const activityStoryIds = new Set(
    deriveSeedActivity(stories).map((e) => e.story_id).filter((id): id is string => id !== null),
  );

  switch (tab) {
    case 'assigned':
      return active.filter((s) => s.assignee_id === currentUserId);
    case 'created':
      return active.filter((s) => s.creator_id === currentUserId);
    case 'subscribed':
      return active.filter((s) => s.follower_ids.includes(currentUserId));
    case 'activity':
      return active.filter((s) => activityStoryIds.has(s.id));
    default:
      return active;
  }
}
