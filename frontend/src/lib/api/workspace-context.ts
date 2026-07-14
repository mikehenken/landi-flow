import type { EpicStatusCategory, WorkflowState } from '@landi-flow/core/types';
import { apiFetch } from '@/lib/api/client';
import { resolveDefaultWorkflowStateId } from '@/lib/workflow-state-defaults';

export interface EpicStatusRow {
  id: string;
  name: string;
  category: EpicStatusCategory;
}

export interface WorkspaceRuntimeContext {
  teamId: string | null;
  defaultWorkflowStateId: string | null;
  defaultEpicStatusId: string | null;
  workflowStates: WorkflowState[];
  epicStatuses: EpicStatusRow[];
}

let cachedContext: WorkspaceRuntimeContext | null = null;
let cachedWorkspaceId: string | null = null;

const emptyContext = (): WorkspaceRuntimeContext => ({
  teamId: null,
  defaultWorkflowStateId: null,
  defaultEpicStatusId: null,
  workflowStates: [],
  epicStatuses: [],
});

export function getWorkspaceRuntimeContext(): WorkspaceRuntimeContext {
  return cachedContext ?? emptyContext();
}

export function getDefaultTeamId(): string | null {
  return cachedContext?.teamId ?? null;
}

export function getDefaultWorkflowStateId(): string | null {
  return cachedContext?.defaultWorkflowStateId ?? null;
}

export function getDefaultEpicStatusId(): string | null {
  return cachedContext?.defaultEpicStatusId ?? null;
}

export function getWorkflowStatesForTeam(): WorkflowState[] {
  return cachedContext?.workflowStates ?? [];
}

export function getEpicStatuses(): EpicStatusRow[] {
  return cachedContext?.epicStatuses ?? [];
}

/**
 * Seed the runtime-context cache from an aggregate bootstrap payload (PERF-03).
 * Callers that already fetched `/api/workspace/bootstrap` should use this to
 * avoid a second serial defaults → states/statuses chain.
 */
export function applyWorkspaceRuntimeContext(
  workspaceId: string,
  context: WorkspaceRuntimeContext,
): void {
  cachedWorkspaceId = workspaceId;
  cachedContext = {
    teamId: context.teamId,
    defaultWorkflowStateId: resolveDefaultWorkflowStateId(
      context.defaultWorkflowStateId,
      context.workflowStates,
    ),
    defaultEpicStatusId: context.defaultEpicStatusId,
    workflowStates: context.workflowStates,
    epicStatuses: context.epicStatuses,
  };
}

export async function loadWorkspaceRuntimeContext(
  workspaceId: string,
): Promise<WorkspaceRuntimeContext> {
  if (cachedWorkspaceId === workspaceId && cachedContext) {
    return cachedContext;
  }

  const defaults = await apiFetch<{
    team_id: string | null;
    default_workflow_state_id: string | null;
    default_epic_status_id: string | null;
  }>(`workspaces/${workspaceId}/context/defaults`, { method: 'GET' });

  // Parallelize independent follow-ups (workflow states need team_id; epic statuses do not).
  const [workflowStates, epicStatuses] = await Promise.all([
    defaults.team_id
      ? apiFetch<{ data: WorkflowState[] }>(
          `workspaces/${workspaceId}/workflow-states?team_id=${encodeURIComponent(defaults.team_id)}`,
          { method: 'GET' },
        ).then((payload) => payload.data ?? [])
      : Promise.resolve([] as WorkflowState[]),
    apiFetch<{ data: EpicStatusRow[] }>(`workspaces/${workspaceId}/epic-statuses`, {
      method: 'GET',
    }).then((payload) => payload.data ?? []),
  ]);

  applyWorkspaceRuntimeContext(workspaceId, {
    teamId: defaults.team_id,
    defaultWorkflowStateId: defaults.default_workflow_state_id,
    defaultEpicStatusId: defaults.default_epic_status_id,
    workflowStates,
    epicStatuses,
  });

  return cachedContext ?? emptyContext();
}

export function resetWorkspaceRuntimeContext(): void {
  cachedContext = null;
  cachedWorkspaceId = null;
}
