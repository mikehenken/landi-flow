import type { WorkflowState } from '@landi-flow/core/types';

/** Pick the default workflow state when workspace defaults omit an id. */
export function resolveDefaultWorkflowStateId(
  defaultFromApi: string | null,
  states: WorkflowState[],
): string | null {
  if (defaultFromApi) {
    return defaultFromApi;
  }
  if (states.length === 0) {
    return null;
  }
  const flaggedDefault = states.find((state) => state.is_default);
  if (flaggedDefault) {
    return flaggedDefault.id;
  }
  const unstarted = states.find((state) => state.category === 'unstarted');
  if (unstarted) {
    return unstarted.id;
  }
  const sorted = [...states].sort((a, b) => a.position - b.position);
  return sorted[0]?.id ?? null;
}
