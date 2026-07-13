import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DEMO_WORKSPACE_ID } from '@/lib/seed-data';

vi.mock('@/lib/api/config', () => ({
  isMockAuthEnabled: vi.fn(() => false),
}));

vi.mock('./workspace-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./workspace-context')>();
  return {
    ...actual,
    loadAgentWorkspaceContext: vi.fn(),
    buildMockAgentWorkspaceContext: vi.fn((workspaceId: string) => ({
      workspaceId,
      teamId: 'team-design',
      teamName: 'Design',
      teamKey: 'DSN',
      teamSlug: 'team-design',
      defaultWorkflowStateId: null,
      defaultEpicStatusId: null,
      completedWorkflowStateId: null,
      completedEpicStatusId: null,
      teams: [],
      workflowStates: [],
      epicStatuses: [],
    })),
  };
});

import { isMockAuthEnabled } from '@/lib/api/config';
import {
  buildMockAgentWorkspaceContext,
  loadAgentWorkspaceContext,
} from './workspace-context';
import { resolveAgentWorkspaceContext } from './resolve-workspace-context';

const LIVE_WORKSPACE_ID = 'd36ba4c7-f4a1-4fa9-a5e4-3ea5588060c2';

describe('resolveAgentWorkspaceContext', () => {
  beforeEach(() => {
    vi.mocked(isMockAuthEnabled).mockReturnValue(false);
    vi.mocked(loadAgentWorkspaceContext).mockReset();
    vi.mocked(buildMockAgentWorkspaceContext).mockClear();
  });

  afterEach(() => {
    vi.mocked(isMockAuthEnabled).mockReturnValue(false);
  });

  it('returns null in production when workspace id is not a UUID', async () => {
    const result = await resolveAgentWorkspaceContext({
      workspaceId: DEMO_WORKSPACE_ID,
      authToken: 'token',
    });
    expect(result).toBeNull();
    expect(loadAgentWorkspaceContext).not.toHaveBeenCalled();
    expect(buildMockAgentWorkspaceContext).not.toHaveBeenCalled();
  });

  it('loads live context for UUID workspaces in production', async () => {
    const liveContext = {
      workspaceId: LIVE_WORKSPACE_ID,
      teamId: '09bf14ef-1111-4222-8333-123456789abc',
      teamName: 'Engineering',
      teamKey: 'ENG',
      teamSlug: 'team-engineering',
      defaultWorkflowStateId: null,
      defaultEpicStatusId: null,
      completedWorkflowStateId: null,
      completedEpicStatusId: null,
      teams: [],
      workflowStates: [],
      epicStatuses: [],
    };
    vi.mocked(loadAgentWorkspaceContext).mockResolvedValue(liveContext);

    const result = await resolveAgentWorkspaceContext({
      workspaceId: LIVE_WORKSPACE_ID,
      authToken: 'token',
    });

    expect(loadAgentWorkspaceContext).toHaveBeenCalledWith(LIVE_WORKSPACE_ID, 'token');
    expect(result).toEqual(liveContext);
    expect(buildMockAgentWorkspaceContext).not.toHaveBeenCalled();
  });

  it('uses mock context only when mock auth is enabled', async () => {
    vi.mocked(isMockAuthEnabled).mockReturnValue(true);

    const result = await resolveAgentWorkspaceContext({
      workspaceId: DEMO_WORKSPACE_ID,
      teamId: 'team-design',
      authToken: null,
    });

    expect(buildMockAgentWorkspaceContext).toHaveBeenCalledWith(DEMO_WORKSPACE_ID);
    expect(loadAgentWorkspaceContext).not.toHaveBeenCalled();
    expect(result?.teamId).toBe('team-design');
  });
});
