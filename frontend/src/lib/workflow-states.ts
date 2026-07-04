export const WORKFLOW_STATES = {
  todo: 'state-todo',
  in_progress: 'state-in-progress',
  done: 'state-done',
  canceled: 'state-canceled',
} as const;

export type WorkflowStateKey = keyof typeof WORKFLOW_STATES;

export function workflowStateToStatus(
  workflowStateId: string,
): WorkflowStateKey {
  const entry = Object.entries(WORKFLOW_STATES).find(
    ([, id]) => id === workflowStateId,
  );
  return (entry?.[0] as WorkflowStateKey | undefined) ?? 'todo';
}
