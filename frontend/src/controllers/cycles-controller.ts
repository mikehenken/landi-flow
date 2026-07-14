import type { Cycle } from '@landi-flow/core/types';
import { isMockAuthEnabled } from '@/lib/api/config';
import { apiFetch, apiList } from '@/lib/api/client';
import { createCorrelationContext } from '@/lib/correlation';
import {
  completeCycle as completeMockCycle,
  createCycle as createMockCycle,
  listCyclesForTeam,
  readCycleAutomation,
  runCycleAutomation,
  writeCycleAutomation,
  type CycleAutomationSettings,
} from '@/lib/cycles/cycle-store';

export type { CycleAutomationSettings };

export async function loadCycles(workspaceId: string, teamId: string): Promise<Cycle[]> {
  if (isMockAuthEnabled()) {
    return listCyclesForTeam(teamId);
  }
  return apiList<Cycle>(`workspaces/${workspaceId}/teams/${teamId}/cycles`);
}

export async function createCycle(input: {
  workspaceId: string;
  teamId: string;
  name: string;
  startsAt: string;
  endsAt: string;
}): Promise<Cycle> {
  if (isMockAuthEnabled()) {
    return createMockCycle(input.teamId, input.name, input.startsAt, input.endsAt);
  }

  const result = await apiFetch<{ cycle: Cycle }>(
    `workspaces/${input.workspaceId}/teams/${input.teamId}/cycles`,
    {
      method: 'POST',
      body: {
        name: input.name,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
      },
      correlationId: createCorrelationContext().correlation_id,
    },
  );
  return result.cycle;
}

export async function completeCycle(input: {
  workspaceId: string;
  teamId: string;
  cycleId: string;
}): Promise<Cycle> {
  if (isMockAuthEnabled()) {
    const updated = completeMockCycle(input.cycleId);
    if (!updated) {
      throw new Error('Cycle not found');
    }
    return updated;
  }

  const result = await apiFetch<{ cycle: Cycle }>(
    `workspaces/${input.workspaceId}/teams/${input.teamId}/cycles/${input.cycleId}/complete`,
    {
      method: 'POST',
      correlationId: createCorrelationContext().correlation_id,
    },
  );
  return result.cycle;
}

export function loadCycleAutomation(teamId: string): CycleAutomationSettings {
  return readCycleAutomation(teamId);
}

export function saveCycleAutomation(settings: CycleAutomationSettings): void {
  writeCycleAutomation(settings);
}

export function executeCycleAutomation(teamId: string): CycleAutomationSettings {
  return runCycleAutomation(teamId);
}
