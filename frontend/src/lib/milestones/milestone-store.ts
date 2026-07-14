import type { Milestone, Story } from '@landi-flow/core/types';
import { DEMO_WORKSPACE_ID, SEED_MILESTONES } from '@/lib/seed-data';
import { workflowStateToStatus } from '@/lib/workflow-states';
import { persistMockStoryPatch } from '@/lib/story-mock-persistence';
import { storyStore } from '@/stores/story-store';
import { epicStore } from '@/stores/epic-store';
import { EPIC_STATUS_IDS } from '@/lib/epic-status';

export const MILESTONES_STORAGE_KEY = 'landi-flow:milestones';

function readMilestones(): Milestone[] {
  if (typeof window === 'undefined') {
    return SEED_MILESTONES;
  }
  try {
    const raw = window.localStorage.getItem(MILESTONES_STORAGE_KEY);
    if (!raw) {
      return SEED_MILESTONES;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return SEED_MILESTONES;
    }
    return parsed as Milestone[];
  } catch {
    return SEED_MILESTONES;
  }
}

function writeMilestones(milestones: Milestone[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(MILESTONES_STORAGE_KEY, JSON.stringify(milestones));
  } catch {
    // ignore
  }
}

export function listMilestonesForEpic(epicId: string): Milestone[] {
  return readMilestones()
    .filter((m) => m.epic_id === epicId)
    .sort((a, b) => a.position - b.position);
}

export function computeMilestoneProgress(milestone: Milestone, stories: Story[]): Milestone {
  const linked = stories.filter((s) => s.milestone_id === milestone.id);
  const completed = linked.filter(
    (s) => workflowStateToStatus(s.workflow_state_id) === 'done',
  );
  const issue_count = linked.length;
  const completed_issue_count = completed.length;
  const progress_pct =
    issue_count === 0 ? 0 : Math.round((completed_issue_count / issue_count) * 100);
  return {
    ...milestone,
    issue_count,
    completed_issue_count,
    progress_pct,
  };
}

export function enrichMilestonesForEpic(epicId: string, stories: Story[]): Milestone[] {
  return listMilestonesForEpic(epicId).map((m) => computeMilestoneProgress(m, stories));
}

export function createMilestone(
  epicId: string,
  name: string,
  targetDate: string | null = null,
): Milestone {
  const now = new Date().toISOString();
  const existing = listMilestonesForEpic(epicId);
  const milestone: Milestone = {
    id: `milestone-${crypto.randomUUID()}`,
    epic_id: epicId,
    workspace_id: DEMO_WORKSPACE_ID,
    name,
    description: null,
    target_date: targetDate,
    position: existing.length,
    completed_at: null,
    issue_count: 0,
    completed_issue_count: 0,
    progress_pct: 0,
    created_at: now,
    updated_at: now,
  };
  writeMilestones([...readMilestones(), milestone]);
  return milestone;
}

export function updateMilestone(
  milestoneId: string,
  patch: Partial<Pick<Milestone, 'name' | 'target_date' | 'position' | 'description'>>,
): Milestone | null {
  const milestones = readMilestones();
  const index = milestones.findIndex((m) => m.id === milestoneId);
  if (index < 0) {
    return null;
  }
  const updated: Milestone = {
    ...milestones[index]!,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  const next = milestones.map((m, i) => (i === index ? updated : m));
  writeMilestones(next);
  return updated;
}

export function reorderMilestones(epicId: string, orderedIds: string[]): void {
  const milestones = readMilestones();
  const epicMilestones = milestones.filter((m) => m.epic_id === epicId);
  const other = milestones.filter((m) => m.epic_id !== epicId);
  const reordered = orderedIds
    .map((id, position) => {
      const row = epicMilestones.find((m) => m.id === id);
      return row ? { ...row, position, updated_at: new Date().toISOString() } : null;
    })
    .filter((row): row is Milestone => row !== null);
  writeMilestones([...other, ...reordered]);
}

/** CAP-051: assign story to milestone. */
export function assignStoryToMilestone(story: Story, milestoneId: string | null): void {
  storyStore.updateStoryMilestone(story.id, milestoneId);
  persistMockStoryPatch(story.id, { milestone_id: milestoneId });
}

/** CAP-054: convert milestone into a new Epic and migrate linked stories. */
export function convertMilestoneToEpic(milestoneId: string, stories: Story[]): string | null {
  const milestones = readMilestones();
  const milestone = milestones.find((m) => m.id === milestoneId);
  if (!milestone) {
    return null;
  }
  const slug = milestone.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const epic = epicStore.createEpic({
    workspaceId: milestone.workspace_id,
    name: milestone.name,
    slug: slug || `milestone-${milestoneId}`,
    statusId: EPIC_STATUS_IDS.planned,
    descriptionMd: milestone.description ?? undefined,
  });
  for (const story of stories) {
    if (story.milestone_id === milestoneId) {
      storyStore.updateStoryEpic(story.id, epic.id);
      storyStore.updateStoryMilestone(story.id, null);
      persistMockStoryPatch(story.id, { milestone_id: null });
    }
  }
  writeMilestones(milestones.filter((m) => m.id !== milestoneId));
  return epic.id;
}
