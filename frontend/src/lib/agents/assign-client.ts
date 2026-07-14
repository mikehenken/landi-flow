'use client';

import type { AssignEntity } from '@/lib/agents/assign-agent';

export interface AssignAndActClientResult {
  ok: boolean;
  live: boolean;
  steps: Array<{ ok: boolean; live: boolean; tool: string; errorText?: string }>;
  errorText?: string;
}

/**
 * Client → `/api/agents/assign`. Persists the assignment through the Agent Action Bus
 * and, when an agent is assigned, triggers it to act. Never throws — returns a result
 * the caller can surface (the store already updated optimistically).
 */
export async function assignAndActRequest(input: {
  entity: AssignEntity;
  entityId: string;
  workspaceId?: string;
  delegateAgentId?: string | null;
  humanId?: string | null;
  entityLabel?: string;
}): Promise<AssignAndActClientResult> {
  try {
    const response = await fetch('/api/agents/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = (await response.json()) as AssignAndActClientResult;
    return data;
  } catch (err) {
    return {
      ok: false,
      live: false,
      steps: [],
      errorText: err instanceof Error ? err.message : 'Assignment request failed',
    };
  }
}
