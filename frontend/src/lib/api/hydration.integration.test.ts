import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetWorkspaceRuntimeContext } from './workspace-context';

/**
 * G-09m-07 — verifies production hydration path issues `/api/v1` fetches
 * (same endpoints StoreHydrator uses via controllers) when MOCK_AUTH is off.
 */

const WORKSPACE_ID = 'ws-e2e-persist';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('production hydration API paths (G-09m-07)', () => {
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

  it('loads workspace context and entity lists via /api/v1 when mock auth is off', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/api/v1/workspaces/ws-e2e-persist/context/defaults')) {
        return Promise.resolve(
          jsonResponse({
            team_id: 'team-1',
            default_workflow_state_id: 'state-todo',
            default_epic_status_id: 'status-active',
          }),
        );
      }

      if (url.includes('/api/v1/workspaces/ws-e2e-persist/workflow-states')) {
        return Promise.resolve(jsonResponse({ data: [{ id: 'state-todo', name: 'Todo' }] }));
      }

      if (url.includes('/teams/team-1/stories')) {
        return Promise.resolve(
          jsonResponse({
            data: [
              {
                id: 'story-persist-1',
                workspace_id: WORKSPACE_ID,
                team_id: 'team-1',
                number: 42,
                identifier: 'LAN-42',
                title: 'Hydrated from API',
                description_json: null,
                description_md: null,
                workflow_state_id: 'state-todo',
                priority: 'none',
                assignee_id: null,
                delegate_agent_id: null,
                epic_id: null,
                milestone_id: null,
                cycle_id: null,
                estimate: null,
                due_date: null,
                sort_order: 1000,
                is_draft: false,
                archived_at: null,
                correlation_id: null,
                created_by: 'user-1',
                created_at: '2026-07-06T00:00:00.000Z',
                updated_at: '2026-07-06T00:00:00.000Z',
              },
            ],
          }),
        );
      }

      if (url.includes('/epics')) {
        return Promise.resolve(jsonResponse({ data: [] }));
      }

      if (url.includes('/customers')) {
        return Promise.resolve(jsonResponse({ data: [] }));
      }

      if (url.includes('/members')) {
        return Promise.resolve(jsonResponse({ data: [] }));
      }

      return Promise.resolve(jsonResponse({ error: 'unexpected', url }, 404));
    });

    const { loadWorkspaceRuntimeContext } = await import('./workspace-context');
    const { loadStories } = await import('../../controllers/story-controller');
    const { loadEpics } = await import('../../controllers/epic-controller');
    const { loadCustomers } = await import('../../controllers/customer-controller');
    const { loadWorkspaceMembers } = await import('../../controllers/member-controller');

    await loadWorkspaceRuntimeContext(WORKSPACE_ID);
    const [stories, epics, customers, members] = await Promise.all([
      loadStories(WORKSPACE_ID),
      loadEpics(WORKSPACE_ID),
      loadCustomers(WORKSPACE_ID),
      loadWorkspaceMembers(WORKSPACE_ID),
    ]);

    expect(stories).toHaveLength(1);
    expect(stories[0]?.title).toBe('Hydrated from API');
    expect(epics).toEqual([]);
    expect(customers).toEqual([]);
    expect(members).toEqual([]);

    const requestedUrls = fetchMock.mock.calls.map(([input]) =>
      typeof input === 'string' ? input : input.toString(),
    );

    expect(requestedUrls.some((url) => url.includes('/context/defaults'))).toBe(true);
    expect(requestedUrls.some((url) => url.includes('/teams/team-1/stories'))).toBe(true);
    expect(requestedUrls.some((url) => url.includes('/epics'))).toBe(true);
    expect(requestedUrls.some((url) => url.includes('/customers'))).toBe(true);
    expect(requestedUrls.some((url) => url.includes('/members'))).toBe(true);
  });
});
