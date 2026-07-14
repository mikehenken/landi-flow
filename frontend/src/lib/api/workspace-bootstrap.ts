import type { Epic, Story, WorkflowState } from '@landi-flow/core/types';
import type { CustomerRecord } from '@/lib/seed-data';
import {
  mapCustomerRow,
  mapEpicRow,
  mapStoryRow,
  type DbCustomerRow,
  type DbEpicRow,
  type DbStoryRow,
} from '@/lib/api/mappers';
import type { WorkspaceMemberWithProfile } from '@/lib/api/types';
import {
  applyWorkspaceRuntimeContext,
  type EpicStatusRow,
  type WorkspaceRuntimeContext,
} from '@/lib/api/workspace-context';
import { ApiRequestError } from '@/lib/api/client';
import { createCorrelationContext } from '@/lib/correlation';

export type WorkspaceBootstrapPhase = 'priority' | 'full';

export interface WorkspaceBootstrapDefaults {
  team_id: string | null;
  default_workflow_state_id: string | null;
  default_epic_status_id: string | null;
}

export interface WorkspaceBootstrapPayload {
  workspace_id: string;
  phase: WorkspaceBootstrapPhase;
  defaults: WorkspaceBootstrapDefaults;
  workflow_states: WorkflowState[];
  epic_statuses: EpicStatusRow[];
  epics: Epic[];
  stories: Story[];
  customers: CustomerRecord[] | null;
  members: WorkspaceMemberWithProfile[] | null;
  correlation_id?: string;
}

interface WorkspaceBootstrapApiResponse {
  workspace_id?: string;
  phase?: string;
  defaults?: WorkspaceBootstrapDefaults;
  workflow_states?: WorkflowState[];
  epic_statuses?: EpicStatusRow[];
  epics?: DbEpicRow[];
  stories?: DbStoryRow[];
  customers?: DbCustomerRow[];
  members?: WorkspaceMemberWithProfile[];
  correlation_id?: string;
  error?: string | { message?: string; code?: string };
  message?: string;
  code?: string;
}

type BootstrapGlobal = typeof globalThis & {
  __landiFlowBootstrapInflight?: Map<string, Promise<WorkspaceBootstrapPayload>>;
  __landiFlowBootstrapCache?: Map<string, WorkspaceBootstrapPayload>;
};

function bootstrapInflight(): Map<string, Promise<WorkspaceBootstrapPayload>> {
  const g = globalThis as BootstrapGlobal;
  if (!g.__landiFlowBootstrapInflight) {
    g.__landiFlowBootstrapInflight = new Map();
  }
  return g.__landiFlowBootstrapInflight;
}

function bootstrapCache(): Map<string, WorkspaceBootstrapPayload> {
  const g = globalThis as BootstrapGlobal;
  if (!g.__landiFlowBootstrapCache) {
    g.__landiFlowBootstrapCache = new Map();
  }
  return g.__landiFlowBootstrapCache;
}

function cacheKey(workspaceId: string, phase: WorkspaceBootstrapPhase): string {
  return `${workspaceId}:${phase}`;
}

export function parseWorkspaceBootstrapPayload(
  workspaceId: string,
  raw: WorkspaceBootstrapApiResponse,
  requestedPhase: WorkspaceBootstrapPhase,
): WorkspaceBootstrapPayload {
  const defaults = raw.defaults ?? {
    team_id: null,
    default_workflow_state_id: null,
    default_epic_status_id: null,
  };
  const phase: WorkspaceBootstrapPhase =
    raw.phase === 'priority' || raw.phase === 'full' ? raw.phase : requestedPhase;

  return {
    workspace_id: raw.workspace_id ?? workspaceId,
    phase,
    defaults,
    workflow_states: raw.workflow_states ?? [],
    epic_statuses: raw.epic_statuses ?? [],
    epics: (raw.epics ?? []).map(mapEpicRow),
    stories: (raw.stories ?? []).map(mapStoryRow),
    customers: phase === 'full' ? (raw.customers ?? []).map(mapCustomerRow) : null,
    members: phase === 'full' ? (raw.members ?? []) : null,
    correlation_id: raw.correlation_id,
  };
}

export function runtimeContextFromBootstrap(
  payload: WorkspaceBootstrapPayload,
): WorkspaceRuntimeContext {
  // applyWorkspaceRuntimeContext re-resolves defaultWorkflowStateId from states.
  return {
    teamId: payload.defaults.team_id,
    defaultWorkflowStateId: payload.defaults.default_workflow_state_id,
    defaultEpicStatusId: payload.defaults.default_epic_status_id,
    workflowStates: payload.workflow_states,
    epicStatuses: payload.epic_statuses,
  };
}

/** Applies bootstrap defaults/states into the shared runtime-context cache. */
export function applyBootstrapRuntimeContext(payload: WorkspaceBootstrapPayload): void {
  applyWorkspaceRuntimeContext(payload.workspace_id, runtimeContextFromBootstrap(payload));
}

async function fetchBootstrapOnce(
  workspaceId: string,
  phase: WorkspaceBootstrapPhase,
): Promise<WorkspaceBootstrapPayload> {
  const correlation = createCorrelationContext().correlation_id;
  const url = `/api/workspace/bootstrap?workspace_id=${encodeURIComponent(workspaceId)}&phase=${phase}`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'X-Landi-Correlation-Id': correlation,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as WorkspaceBootstrapApiResponse;

  if (!response.ok) {
    const errorBody =
      typeof payload.error === 'object' && payload.error !== null ? payload.error : null;
    const message =
      (errorBody && typeof errorBody.message === 'string' && errorBody.message) ||
      (typeof payload.message === 'string' ? payload.message : null) ||
      (typeof payload.error === 'string' ? payload.error : null) ||
      `Bootstrap request failed (${response.status})`;
    throw new ApiRequestError(
      message,
      response.status,
      (errorBody && typeof errorBody.code === 'string' && errorBody.code) ||
        (typeof payload.code === 'string' ? payload.code : null),
      typeof payload.correlation_id === 'string' ? payload.correlation_id : correlation,
    );
  }

  return parseWorkspaceBootstrapPayload(workspaceId, payload, phase);
}

/**
 * PERF-03: single hop to the Next bootstrap aggregate (auth once + upstream fan-out / Workers aggregate).
 * Settled results are cached per workspace+phase so ActiveWorkspaceProvider prefetch and
 * StoreHydrator share one network round-trip. Soft workspace switch clears the cache.
 */
export async function loadWorkspaceBootstrap(
  workspaceId: string,
  options: { phase?: WorkspaceBootstrapPhase } = {},
): Promise<WorkspaceBootstrapPayload> {
  const phase = options.phase ?? 'priority';
  const key = cacheKey(workspaceId, phase);

  const cached = bootstrapCache().get(key);
  if (cached) {
    return cached;
  }

  const existing = bootstrapInflight().get(key);
  if (existing) {
    return existing;
  }

  const promise = fetchBootstrapOnce(workspaceId, phase)
    .then((payload) => {
      bootstrapCache().set(key, payload);
      return payload;
    })
    .finally(() => {
      bootstrapInflight().delete(key);
    });
  bootstrapInflight().set(key, promise);
  return promise;
}

/** Fire-and-forget prefetch once a workspace UUID is known (ActiveWorkspaceProvider).
 * Defaults to `full` so prefetch shares the same cache key StoreHydrator consumes.
 */
export function prefetchWorkspaceBootstrap(
  workspaceId: string,
  phase: WorkspaceBootstrapPhase = 'full',
): void {
  void loadWorkspaceBootstrap(workspaceId, { phase }).catch(() => {
    // Prefetch is best-effort; StoreHydrator will retry / fall back.
  });
}

export function resetWorkspaceBootstrapCache(): void {
  bootstrapInflight().clear();
  bootstrapCache().clear();
}
