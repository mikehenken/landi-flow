import { describe, expect, it, vi, beforeEach } from 'vitest';
import { validateEnrichedToolInput } from './workspace-context';
import { resolveToolInputForApply } from './tool-input-resolve';

const DESIGN_TEAM_UUID = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890';
const WORKFLOW_STATE_UUID = 'b1c2d3e4-f5a6-4789-bcde-ef1234567890';
const EPIC_UUID = 'c2d3e4f5-a6b7-4890-cdef-123456789abc';
const WORKSPACE_ID = 'd36ba4c7-f4a1-4fa9-a5e4-3ea5588060c2';

vi.mock('@/lib/api/upstream-fetch', () => ({
  fetchFlowApiUpstream: vi.fn(),
}));

import { fetchFlowApiUpstream } from '@/lib/api/upstream-fetch';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('resolveToolInputForApply', () => {
  beforeEach(() => {
    vi.mocked(fetchFlowApiUpstream).mockReset();
  });

  it('resolves exact user story.create payload with team-design route ref and epic slug', async () => {
    vi.mocked(fetchFlowApiUpstream).mockImplementation(async (path: string) => {
      if (path.includes('/teams')) {
        return jsonResponse({
          data: [
            {
              id: DESIGN_TEAM_UUID,
              name: 'Design',
              key: 'DSN',
              slug: 'design',
            },
          ],
        });
      }
      if (path.includes('/workflow-states')) {
        return jsonResponse({
          data: [
            {
              id: WORKFLOW_STATE_UUID,
              team_id: DESIGN_TEAM_UUID,
              name: 'Todo',
              category: 'unstarted',
              position: 0,
              is_default: true,
            },
          ],
        });
      }
      if (path.includes('/epics')) {
        return jsonResponse({
          data: [
            {
              id: EPIC_UUID,
              name: 'Progressive Disclosure Shell',
              slug: 'progressive-disclosure-shell',
            },
          ],
        });
      }
      return jsonResponse({ data: [] }, 404);
    });

    const enriched = await resolveToolInputForApply({
      toolName: 'story.create',
      input: {
        team_id: 'team-design',
        title: 'dark mode toggle',
        epic_id: 'progressive-disclosure-shell',
      },
      workspaceContext: {
        workspaceId: WORKSPACE_ID,
        teamId: null,
        teamName: null,
        teamKey: null,
        teamSlug: null,
        defaultWorkflowStateId: null,
        defaultEpicStatusId: null,
        completedWorkflowStateId: null,
        completedEpicStatusId: null,
        teams: [],
        workflowStates: [],
        epicStatuses: [],
      },
      workspaceId: WORKSPACE_ID,
      accessToken: 'token',
    });

    expect(enriched.team_id).toBe(DESIGN_TEAM_UUID);
    expect(enriched.workflow_state_id).toBe(WORKFLOW_STATE_UUID);
    expect(enriched.epic_id).toBe(EPIC_UUID);
    expect(validateEnrichedToolInput('story.create', enriched)).toBeNull();
  });
});
