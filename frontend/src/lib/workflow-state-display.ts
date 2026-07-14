import type { WorkflowCategory } from '@landi-flow/core/types';
import type { WorkflowStateKey } from '@/lib/workflow-states';
import { workflowStateToStatus } from '@/lib/workflow-states';

export type WorkflowStatusBadgeVariant =
  | 'statusTodo'
  | 'statusInProgress'
  | 'statusDone'
  | 'secondary';

const STATUS_VARIANT: Record<
  WorkflowStateKey,
  WorkflowStatusBadgeVariant
> = {
  triage: 'secondary',
  todo: 'statusTodo',
  in_progress: 'statusInProgress',
  done: 'statusDone',
  canceled: 'secondary',
};

export function workflowCategoryToStatusKey(category: WorkflowCategory): WorkflowStateKey {
  switch (category) {
    case 'triage':
      return 'triage';
    case 'unstarted':
    case 'backlog':
      return 'todo';
    case 'started':
      return 'in_progress';
    case 'completed':
      return 'done';
    case 'canceled':
    case 'duplicate':
      return 'canceled';
    default:
      return 'todo';
  }
}

export function resolveWorkflowStateKey(
  workflowStateId: string,
  category?: WorkflowCategory,
): WorkflowStateKey {
  if (category) {
    return workflowCategoryToStatusKey(category);
  }
  return workflowStateToStatus(workflowStateId);
}

export function workflowStateBadgeVariant(
  workflowStateId: string,
  category?: WorkflowCategory,
): WorkflowStatusBadgeVariant {
  const key = resolveWorkflowStateKey(workflowStateId, category);
  return STATUS_VARIANT[key];
}
