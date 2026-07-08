import type { WorkflowState } from '@landi-flow/core/types';
import { apiFetch } from '@/lib/api/client';

export interface WorkspaceRuntimeContext {
  teamId: string | null;
  defaultWorkflowStateId: string | null;
  defaultEpicStatusId: string | null;
  workflowStates: WorkflowState[];
}

let cachedContext: WorkspaceRuntimeContext | null = null;
let cachedWorkspaceId: string | null = null;

const emptyContext = (): WorkspaceRuntimeContext => ({
  teamId: null,
  defaultWorkflowStateId: null,
  defaultEpicStatusId: null,
  workflowStates: [],
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

  let workflowStates: WorkflowState[] = [];
  if (defaults.team_id) {
    const statesPayload = await apiFetch<{ data: WorkflowState[] }>(
      `workspaces/${workspaceId}/workflow-states?team_id=${encodeURIComponent(defaults.team_id)}`,
      { method: 'GET' },
    );
    workflowStates = statesPayload.data ?? [];
  }

  cachedWorkspaceId = workspaceId;
  cachedContext = {
    teamId: defaults.team_id,
    defaultWorkflowStateId: defaults.default_workflow_state_id,
    defaultEpicStatusId: defaults.default_epic_status_id,
    workflowStates,
  };

  return cachedContext;
}

export function resetWorkspaceRuntimeContext(): void {
  cachedContext = null;
  cachedWorkspaceId = null;
}
