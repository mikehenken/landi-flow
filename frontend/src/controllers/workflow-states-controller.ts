import type { WorkflowCategory, WorkflowState } from '@landi-flow/core/types';
import { isMockAuthEnabled } from '@/lib/api/config';
import { apiFetch, apiList } from '@/lib/api/client';
import { createCorrelationContext } from '@/lib/correlation';
import { getWorkflowStatesForTeamSettings } from '@/lib/taxonomy/taxonomy-store';
import { DEMO_TEAM_ID } from '@/lib/seed-data';

export async function loadWorkflowStates(
  workspaceId: string,
  teamId: string,
): Promise<WorkflowState[]> {
  if (isMockAuthEnabled()) {
    void workspaceId;
    return getWorkflowStatesForTeamSettings(teamId || DEMO_TEAM_ID);
  }

  return apiList<WorkflowState>(
    `workspaces/${workspaceId}/workflow-states?team_id=${encodeURIComponent(teamId)}`,
  );
}

export async function createWorkflowState(input: {
  workspaceId: string;
  teamId: string;
  name: string;
  category: WorkflowCategory;
  position?: number;
}): Promise<WorkflowState> {
  if (isMockAuthEnabled()) {
    throw new Error('Workflow state creation requires live API — not available in mock auth mode');
  }

  const result = await apiFetch<{ workflow_state: WorkflowState }>(
    `workspaces/${input.workspaceId}/workflow-states`,
    {
      method: 'POST',
      body: {
        team_id: input.teamId,
        name: input.name,
        category: input.category,
        position: input.position ?? 0,
      },
      correlationId: createCorrelationContext().correlation_id,
    },
  );
  return result.workflow_state;
}
