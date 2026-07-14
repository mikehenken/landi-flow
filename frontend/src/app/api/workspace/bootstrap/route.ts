import { NextResponse, type NextRequest } from 'next/server';
import type { WorkflowState } from '@landi-flow/core/types';
import { createCorrelationContext } from '@/lib/correlation';
import {
  fetchFlowApiUpstream,
  resolveFlowApiUpstreamBase,
} from '@/lib/api/upstream-fetch';
import { resolveCachedProxyAuth } from '@/lib/api/resolve-cached-proxy-auth';
import { isWorkspaceUuid } from '@/lib/workspace/is-workspace-uuid';
import type { EpicStatusRow } from '@/lib/api/workspace-context';

export const dynamic = 'force-dynamic';

type BootstrapPhase = 'priority' | 'full';

interface ContextDefaults {
  team_id: string | null;
  default_workflow_state_id: string | null;
  default_epic_status_id: string | null;
}

async function upstreamJson<T>(
  path: string,
  accessToken: string,
  correlationId: string,
): Promise<{ ok: true; status: number; body: T } | { ok: false; status: number; body: unknown }> {
  let response: Response;
  try {
    response = await fetchFlowApiUpstream(path, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'X-Landi-Correlation-Id': correlationId,
      },
    });
  } catch {
    return { ok: false, status: 503, body: { error: 'api_not_configured' } };
  }

  const body = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    return { ok: false, status: response.status, body };
  }
  return { ok: true, status: response.status, body };
}

/**
 * Fan-out aggregate against existing Workers endpoints (fallback when
 * `/workspaces/{id}/bootstrap` is not deployed yet).
 */
async function fanOutBootstrap(
  workspaceId: string,
  phase: BootstrapPhase,
  accessToken: string,
  correlationId: string,
): Promise<NextResponse> {
  const defaultsResult = await upstreamJson<ContextDefaults>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/context/defaults`,
    accessToken,
    correlationId,
  );
  if (!defaultsResult.ok) {
    return NextResponse.json(defaultsResult.body, { status: defaultsResult.status });
  }

  const defaults = defaultsResult.body;
  const teamId = defaults.team_id;

  const [workflowStatesResult, epicStatusesResult, epicsResult, storiesResult, customersResult, membersResult] =
    await Promise.all([
      teamId
        ? upstreamJson<{ data: WorkflowState[] }>(
            `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/workflow-states?team_id=${encodeURIComponent(teamId)}`,
            accessToken,
            correlationId,
          )
        : Promise.resolve({
            ok: true as const,
            status: 200,
            body: { data: [] as WorkflowState[] },
          }),
      upstreamJson<{ data: EpicStatusRow[] }>(
        `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/epic-statuses`,
        accessToken,
        correlationId,
      ),
      upstreamJson<{ data: unknown[] }>(
        `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/epics`,
        accessToken,
        correlationId,
      ),
      teamId
        ? upstreamJson<{ data: unknown[] }>(
            `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/teams/${encodeURIComponent(teamId)}/stories`,
            accessToken,
            correlationId,
          )
        : Promise.resolve({
            ok: true as const,
            status: 200,
            body: { data: [] as unknown[] },
          }),
      phase === 'full'
        ? upstreamJson<{ data: unknown[] }>(
            `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/customers`,
            accessToken,
            correlationId,
          )
        : Promise.resolve({ ok: true as const, status: 200, body: { data: [] as unknown[] } }),
      phase === 'full'
        ? upstreamJson<{ data: unknown[] }>(
            `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/members`,
            accessToken,
            correlationId,
          )
        : Promise.resolve({ ok: true as const, status: 200, body: { data: [] as unknown[] } }),
    ]);

  const firstFailure = [
    workflowStatesResult,
    epicStatusesResult,
    epicsResult,
    storiesResult,
    ...(phase === 'full' ? [customersResult, membersResult] : []),
  ].find((result) => !result.ok);

  if (firstFailure && !firstFailure.ok) {
    return NextResponse.json(firstFailure.body, { status: firstFailure.status });
  }

  return NextResponse.json({
    workspace_id: workspaceId,
    phase,
    defaults: {
      team_id: defaults.team_id ?? null,
      default_workflow_state_id: defaults.default_workflow_state_id ?? null,
      default_epic_status_id: defaults.default_epic_status_id ?? null,
    },
    workflow_states: workflowStatesResult.ok ? (workflowStatesResult.body.data ?? []) : [],
    epic_statuses: epicStatusesResult.ok ? (epicStatusesResult.body.data ?? []) : [],
    epics: epicsResult.ok ? (epicsResult.body.data ?? []) : [],
    stories: storiesResult.ok ? (storiesResult.body.data ?? []) : [],
    ...(phase === 'full'
      ? {
          customers: customersResult.ok ? (customersResult.body.data ?? []) : [],
          members: membersResult.ok ? (membersResult.body.data ?? []) : [],
        }
      : {}),
    correlation_id: correlationId,
    source: 'fanout',
  });
}

/**
 * PERF-03 bootstrap aggregate.
 * Auth once via resolveCachedProxyAuth, then prefer Workers `/bootstrap`
 * (single upstream hop) with parallel fan-out fallback for older API deploys.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!resolveFlowApiUpstreamBase()) {
    return NextResponse.json(
      { error: 'api_not_configured', message: 'FLOW_API_URL is not configured' },
      { status: 503 },
    );
  }

  const workspaceId = request.nextUrl.searchParams.get('workspace_id');
  if (!workspaceId || !isWorkspaceUuid(workspaceId)) {
    return NextResponse.json(
      { error: 'invalid_request', message: 'workspace_id (uuid) is required' },
      { status: 400 },
    );
  }

  const phaseParam = request.nextUrl.searchParams.get('phase');
  const phase: BootstrapPhase = phaseParam === 'priority' ? 'priority' : 'full';

  const auth = await resolveCachedProxyAuth(request.headers.get('cookie') ?? '');
  if (!auth.ok) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Authentication required' },
      { status: 401 },
    );
  }

  const correlation =
    request.headers.get('x-landi-correlation-id') ??
    request.headers.get('x-correlation-id') ??
    createCorrelationContext().correlation_id;

  const workersBootstrapPath =
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/bootstrap?phase=${phase}`;
  const workersResult = await upstreamJson<Record<string, unknown>>(
    workersBootstrapPath,
    auth.accessToken,
    correlation,
  );

  if (workersResult.ok) {
    return NextResponse.json({
      ...workersResult.body,
      workspace_id: workspaceId,
      phase,
      correlation_id:
        typeof workersResult.body.correlation_id === 'string'
          ? workersResult.body.correlation_id
          : correlation,
      source: 'workers',
    });
  }

  // Older API workers without /bootstrap — fan out existing endpoints server-side.
  if (workersResult.status === 404) {
    return fanOutBootstrap(workspaceId, phase, auth.accessToken, correlation);
  }

  return NextResponse.json(workersResult.body, { status: workersResult.status });
}
