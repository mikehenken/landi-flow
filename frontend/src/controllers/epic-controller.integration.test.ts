import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EPIC_STATUS_IDS } from '@/lib/epic-status';
import { resetWorkspaceRuntimeContext } from '@/lib/api/workspace-context';

const WORKSPACE_ID = '454e8fba-98cf-4097-b3b2-a40b72da10c2';
const BACKLOG_UUID = 'a1111111-1111-4111-8111-111111111111';
const PLANNED_UUID = 'b2222222-2222-4222-8222-222222222222';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createEpic (production API path)', () => {
  const originalEnv = { ...process.env };
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    vi.resetModules();
    resetWorkspaceRuntimeContext();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_MOCK_AUTH: 'false',
    };
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
    resetWorkspaceRuntimeContext();
  });

  it('resolves mock slug status_id to UUID before POST', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/context/defaults')) {
        return Promise.resolve(
          jsonResponse({
            team_id: '76752feb-127b-45b8-9675-7825aba12c41',
            default_workflow_state_id: null,
            default_epic_status_id: PLANNED_UUID,
          }),
        );
      }

      if (url.includes('/epic-statuses')) {
        return Promise.resolve(
          jsonResponse({
            data: [
              { id: BACKLOG_UUID, name: 'Backlog', category: 'backlog' },
              { id: PLANNED_UUID, name: 'Planned', category: 'planned' },
            ],
          }),
        );
      }

      if (url.includes('/epics') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as { status_id: string; name: string };
        expect(body.status_id).toBe(BACKLOG_UUID);
        expect(body.name).toBe('Ship payments');
        return Promise.resolve(
          jsonResponse({
            epic: {
              id: 'e5f6a7b8-c9d0-4123-a456-426614174000',
              workspace_id: WORKSPACE_ID,
              name: body.name,
              slug: 'ship-payments',
              description_json: null,
              description_md: null,
              status_id: body.status_id,
              priority: 'none',
              lead_id: null,
              delegate_agent_id: null,
              start_date: null,
              target_date: null,
              progress_cache: null,
              correlation_id: null,
              archived_at: null,
              created_at: '2026-07-13T00:00:00.000Z',
              updated_at: '2026-07-13T00:00:00.000Z',
            },
          }),
        );
      }

      if (url.includes('/workflow-states')) {
        return Promise.resolve(jsonResponse({ data: [] }));
      }

      return Promise.resolve(jsonResponse({ error: 'unexpected', url }, 404));
    });

    const { createEpic } = await import('./epic-controller');
    const epic = await createEpic({
      workspaceId: WORKSPACE_ID,
      name: 'Ship payments',
      statusId: EPIC_STATUS_IDS.backlog,
    });

    expect(epic.status_id).toBe(BACKLOG_UUID);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true);
  });

  it('throws before POST when slug cannot be resolved to a UUID', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/context/defaults')) {
        return Promise.resolve(
          jsonResponse({
            team_id: null,
            default_workflow_state_id: null,
            default_epic_status_id: null,
          }),
        );
      }

      if (url.includes('/epic-statuses')) {
        return Promise.resolve(jsonResponse({ data: [] }));
      }

      return Promise.resolve(jsonResponse({ error: 'unexpected', url }, 404));
    });

    const { createEpic } = await import('./epic-controller');

    await expect(
      createEpic({
        workspaceId: WORKSPACE_ID,
        name: 'Broken epic',
        statusId: EPIC_STATUS_IDS.backlog,
      }),
    ).rejects.toThrow(/could not be resolved to a workspace UUID/);

    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });
});
