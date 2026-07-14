import type { Story, WorkflowState } from '@landi-flow/core/types';
import { WORKFLOW_STATES } from '@/lib/workflow-states';

export interface BurnupPoint {
  date: string;
  scope: number;
  completed: number;
}

export interface EpicProgressSummary {
  totalStories: number;
  completedStories: number;
  percentComplete: number;
  burnup: BurnupPoint[];
}

function isCompletedState(workflowStateId: string, workflowStates: WorkflowState[]): boolean {
  const state = workflowStates.find((entry) => entry.id === workflowStateId);
  if (state?.category === 'completed') {
    return true;
  }
  return workflowStateId === WORKFLOW_STATES.done;
}

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** CAP-048: cumulative scope vs completed story counts for burn-up chart. */
export function computeEpicBurnup(
  epicStories: Story[],
  workflowStates: WorkflowState[],
  startDate: string | null,
  targetDate: string | null,
): EpicProgressSummary {
  const sortedStories = [...epicStories].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  );

  const totalStories = sortedStories.length;
  const completedStories = sortedStories.filter((story) =>
    isCompletedState(story.workflow_state_id, workflowStates),
  ).length;

  const percentComplete =
    totalStories === 0 ? 0 : Math.round((completedStories / totalStories) * 100);

  if (totalStories === 0) {
    return { totalStories: 0, completedStories: 0, percentComplete: 0, burnup: [] };
  }

  const firstDate = startDate ?? toDateKey(sortedStories[0]?.created_at ?? new Date().toISOString());
  const lastDate =
    targetDate ??
    toDateKey(
      sortedStories.reduce(
        (latest, story) =>
          new Date(story.updated_at).getTime() > new Date(latest).getTime()
            ? story.updated_at
            : latest,
        sortedStories[0]?.updated_at ?? new Date().toISOString(),
      ),
    );

  const burnup: BurnupPoint[] = [];
  let cursor = firstDate;
  let guard = 0;

  while (cursor <= lastDate && guard < 366) {
    const scope = sortedStories.filter(
      (story) => toDateKey(story.created_at) <= cursor,
    ).length;
    const completed = sortedStories.filter(
      (story) =>
        isCompletedState(story.workflow_state_id, workflowStates) &&
        toDateKey(story.updated_at) <= cursor,
    ).length;

    burnup.push({ date: cursor, scope, completed });
    cursor = addDays(cursor, 1);
    guard += 1;
  }

  if (burnup.length === 0) {
    burnup.push({ date: firstDate, scope: totalStories, completed: completedStories });
  }

  return { totalStories, completedStories, percentComplete, burnup };
}
