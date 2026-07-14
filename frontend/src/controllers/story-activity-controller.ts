import type { ActivityEvent, Story } from '@landi-flow/core/types';
import { isMockAuthEnabled } from '@/lib/api/config';
import { apiList } from '@/lib/api/client';
import { deriveStoryActivity } from '@/lib/story-lifecycle/story-history';
import { storyStore } from '@/stores/story-store';

export async function loadStoryActivity(story: Story): Promise<ActivityEvent[]> {
  if (isMockAuthEnabled()) {
    return deriveStoryActivity(story.id, storyStore.getServerSnapshot().stories);
  }

  return apiList<ActivityEvent>(
    `workspaces/${story.workspace_id}/teams/${story.team_id}/stories/${story.id}/activity`,
  );
}
