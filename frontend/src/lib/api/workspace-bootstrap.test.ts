import { afterEach, describe, expect, it } from 'vitest';
import {
  applyBootstrapRuntimeContext,
  parseWorkspaceBootstrapPayload,
  resetWorkspaceBootstrapCache,
  runtimeContextFromBootstrap,
} from './workspace-bootstrap';
import {
  getDefaultTeamId,
  getEpicStatuses,
  getWorkflowStatesForTeam,
  resetWorkspaceRuntimeContext,
} from './workspace-context';

describe('workspace-bootstrap (PERF-03)', () => {
  afterEach(() => {
    resetWorkspaceBootstrapCache();
    resetWorkspaceRuntimeContext();
  });

  it('parses a full aggregate payload into mapped domain rows', () => {
    const payload = parseWorkspaceBootstrapPayload(
      '11111111-1111-4111-8111-111111111111',
      {
        workspace_id: '11111111-1111-4111-8111-111111111111',
        phase: 'full',
        defaults: {
          team_id: '22222222-2222-4222-8222-222222222222',
          default_workflow_state_id: 'state-todo',
          default_epic_status_id: 'status-active',
        },
        workflow_states: [
          {
            id: 'state-todo',
            team_id: '22222222-2222-4222-8222-222222222222',
            name: 'Todo',
            category: 'unstarted',
            position: 0,
            is_default: true,
          },
        ],
        epic_statuses: [{ id: 'status-active', name: 'Active', category: 'in_progress' }],
        epics: [
          {
            id: 'epic-1',
            workspace_id: '11111111-1111-4111-8111-111111111111',
            name: 'Ship',
            slug: 'ship',
            description_json: null,
            description_md: null,
            status_id: 'status-active',
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
        ],
        stories: [
          {
            id: 'story-1',
            workspace_id: '11111111-1111-4111-8111-111111111111',
            team_id: '22222222-2222-4222-8222-222222222222',
            number: 1,
            identifier: 'LAN-1',
            title: 'Bootstrap story',
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
            created_at: '2026-07-13T00:00:00.000Z',
            updated_at: '2026-07-13T00:00:00.000Z',
          },
        ],
        customers: [
          {
            id: 'cust-1',
            name: 'Acme',
            domain: 'acme.test',
            tier: null,
            revenue: null,
            status: 'active',
          },
        ],
        members: [],
      },
      'full',
    );

    expect(payload.epics).toHaveLength(1);
    expect(payload.epics[0]?.name).toBe('Ship');
    expect(payload.stories).toHaveLength(1);
    expect(payload.stories[0]?.title).toBe('Bootstrap story');
    expect(payload.customers).toHaveLength(1);
    expect(payload.members).toEqual([]);

    applyBootstrapRuntimeContext(payload);
    expect(getDefaultTeamId()).toBe('22222222-2222-4222-8222-222222222222');
    expect(getWorkflowStatesForTeam()).toHaveLength(1);
    expect(getEpicStatuses()[0]?.id).toBe('status-active');

    const runtime = runtimeContextFromBootstrap(payload);
    expect(runtime.teamId).toBe('22222222-2222-4222-8222-222222222222');
  });

  it('omits deferred collections for priority phase', () => {
    const payload = parseWorkspaceBootstrapPayload(
      '11111111-1111-4111-8111-111111111111',
      {
        phase: 'priority',
        defaults: {
          team_id: null,
          default_workflow_state_id: null,
          default_epic_status_id: null,
        },
        workflow_states: [],
        epic_statuses: [],
        epics: [],
        stories: [],
      },
      'priority',
    );

    expect(payload.customers).toBeNull();
    expect(payload.members).toBeNull();
  });
});
