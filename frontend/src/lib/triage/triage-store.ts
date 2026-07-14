import type { Story } from '@landi-flow/core/types';
import { DEMO_TEAM_ID, SEED_STORIES } from '@/lib/seed-data';
import { WORKFLOW_STATES } from '@/lib/workflow-states';
import { persistMockStoryPatch } from '@/lib/story-mock-persistence';
import { storyStore } from '@/stores/story-store';

export const TRIAGE_DISMISSED_STORAGE_KEY = 'landi-flow:triage-dismissed';

export interface TriageInboxItem {
  story_id: string;
  team_id: string;
  accepted_at: string | null;
  declined_at: string | null;
}

function readDismissedIds(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set();
  }
  try {
    const raw = window.localStorage.getItem(TRIAGE_DISMISSED_STORAGE_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

function writeDismissedIds(ids: Set<string>): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(TRIAGE_DISMISSED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

export function listTriageStories(teamId: string, stories: Story[]): Story[] {
  const dismissed = readDismissedIds();
  return stories.filter(
    (story) =>
      story.team_id === teamId &&
      story.workflow_state_id === WORKFLOW_STATES.triage &&
      !dismissed.has(story.id) &&
      !story.is_draft &&
      story.archived_at === null,
  );
}

export function getDefaultTriageTeamId(): string {
  return DEMO_TEAM_ID;
}

/** CAP-016: accept moves story to Todo workflow state. */
export function acceptTriageStory(story: Story): void {
  storyStore.updateStoryWorkflowState(story.id, WORKFLOW_STATES.todo);
  persistMockStoryPatch(story.id, { workflow_state_id: WORKFLOW_STATES.todo });
}

/** CAP-016: decline moves story to Canceled and records dismissal. */
export function declineTriageStory(story: Story): void {
  storyStore.updateStoryWorkflowState(story.id, WORKFLOW_STATES.canceled);
  persistMockStoryPatch(story.id, { workflow_state_id: WORKFLOW_STATES.canceled });
  const dismissed = readDismissedIds();
  dismissed.add(story.id);
  writeDismissedIds(dismissed);
}

export function seedTriageStoryIds(): string[] {
  return SEED_STORIES.filter((s) => s.workflow_state_id === WORKFLOW_STATES.triage).map(
    (s) => s.id,
  );
}
