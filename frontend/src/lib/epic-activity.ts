import type { ActivityEvent } from '@landi-flow/core/types';
import { deriveSeedActivity } from '@/lib/inbox/derive-inbox-seed';

/** CAP-049: epic-scoped activity events (stories + epic-level changes). */
export function deriveEpicActivity(epicId: string): ActivityEvent[] {
  return deriveSeedActivity().filter((event) => event.epic_id === epicId);
}

export function getLatestEpicActivity(epicId: string): ActivityEvent | null {
  const events = deriveEpicActivity(epicId);
  return events[0] ?? null;
}
