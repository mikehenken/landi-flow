import type { ActivityEvent, Story } from '@landi-flow/core/types';
import { deriveSeedActivity } from '@/lib/inbox/derive-inbox-seed';

/** CAP-011: story-scoped activity events (newest first). */
export function deriveStoryActivity(storyId: string, stories?: Story[]): ActivityEvent[] {
  const all = deriveSeedActivity(stories);
  return all.filter((event) => event.story_id === storyId);
}

export function extractRestorableDescription(event: ActivityEvent): string | null {
  const previous = event.payload.previous_description_md;
  if (typeof previous === 'string' && previous.length > 0) {
    return previous;
  }
  return null;
}
