import type { Story, WorkflowState } from '@landi-flow/core/types';
import { getSubStoryIds } from '@/lib/story-relations-seed';

export interface SubStoryProgress {
  total: number;
  completed: number;
  percent: number;
}

/** CAP-006: completion % from child stories under a parent. */
export function computeSubStoryProgress(
  parentStoryId: string,
  stories: Story[],
  workflowStates: WorkflowState[],
): SubStoryProgress | null {
  const childIds = getSubStoryIds(parentStoryId);
  if (childIds.length === 0) {
    return null;
  }

  const completedStateIds = new Set(
    workflowStates.filter((state) => state.category === 'completed').map((state) => state.id),
  );

  const children = stories.filter((story) => childIds.includes(story.id));
  const completed = children.filter((story) => completedStateIds.has(story.workflow_state_id)).length;
  const total = children.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, percent };
}
