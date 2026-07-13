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

  const epicStatusesPayload = await apiFetch<{ data: EpicStatusRow[] }>(
    `workspaces/${workspaceId}/epic-statuses`,
    { method: 'GET' },
  );
  const epicStatuses = epicStatusesPayload.data ?? [];

  cachedWorkspaceId = workspaceId;
  cachedContext = {
    teamId: defaults.team_id,
    defaultWorkflowStateId: resolveDefaultWorkflowStateId(
      defaults.default_workflow_state_id,
      workflowStates,
    ),
    defaultEpicStatusId: defaults.default_epic_status_id,
    workflowStates,
    epicStatuses,
  };

  return cachedContext;
}

export function resetWorkspaceRuntimeContext(): void {
  cachedContext = null;
  cachedWorkspaceId = null;
}
