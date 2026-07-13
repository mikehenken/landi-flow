import { describe, expect, it, vi } from 'vitest';
import {
  enrichToolInputWithWorkspaceContext,
  validateEnrichedToolInput,
  type McpWorkspaceContext,
} from '@landi-flow/core/mcp';
import { enrichMutationToolInput } from './input-enrichment.js';

const ENG_TEAM_UUID = 'b2c3d4e5-f6a7-4901-bcde-f12345678901';
const BACKLOG_STATE_UUID = 'b1c2d3e4-f5a6-4789-bcde-ef1234567890';
const PLANNED_EPIC_STATUS_UUID = 'e5f6a7b8-c9d0-4123-ef01-345678901234';

const mockContext: McpWorkspaceContext = {
  workspace_id: 'ws-1',
  workspace_name: 'Test',
  workspace_slug: 'test',
  default_team_id: ENG_TEAM_UUID,
  default_epic_status_id: PLANNED_EPIC_STATUS_UUID,
  completed_epic_status_id: null,
  member_id: null,
  labels: [],
  members: [],
  epic_statuses: [
    { id: PLANNED_EPIC_STATUS_UUID, name: 'Planned', category: 'planned', slug: 'planned' },
  ],
  teams: [
    {
      id: ENG_TEAM_UUID,
      name: 'Engineering',
      key: 'ENG',
      slug: 'team-engineering',
      workflow_states: [
        { id: BACKLOG_STATE_UUID, name: 'Backlog', category: 'backlog', team_id: ENG_TEAM_UUID },
      ],
      default_workflow_state_id: BACKLOG_STATE_UUID,
      completed_workflow_state_id: null,
      workflow_defaults: {
        backlog: BACKLOG_STATE_UUID,
        unstarted: null,
        done: null,
        complete: null,
      },
    },
  ],
};

describe('enrichMutationToolInput', () => {
  it('story.create with only title succeeds after enrichment', async () => {
    const service = {
      searchStories: vi.fn(),
      getStory: vi.fn(),
      getEpic: vi.fn(),
      listEpics: vi.fn(),
    };

    const enriched = await enrichMutationToolInput({
      db: {} as never,
      service: service as never,
      toolName: 'story.create',
      input: { title: 'foo' },
      workspaceId: 'ws-1',
      userId: null,
      workspaceContext: mockContext,
    });

    expect(enriched).toMatchObject({
      title: 'foo',
      team_id: ENG_TEAM_UUID,
      workflow_state_id: BACKLOG_STATE_UUID,
    });
    expect(validateEnrichedToolInput('story.create', enriched)).toBeNull();
  });

  it('epic.create with only name injects slug and status', async () => {
    const service = {
      searchStories: vi.fn(),
      getStory: vi.fn(),
      getEpic: vi.fn(),
      listEpics: vi.fn(),
    };

    const enriched = await enrichMutationToolInput({
      db: {} as never,
      service: service as never,
      toolName: 'epic.create',
      input: { name: 'Launch v2' },
      workspaceId: 'ws-1',
      userId: null,
      workspaceContext: mockContext,
    });

    expect(enriched.slug).toBe('launch-v2');
    expect(enriched.status_id).toBe(PLANNED_EPIC_STATUS_UUID);
  });
});

describe('sync enrichment re-export', () => {
  it('matches core package behavior for story_create alias', () => {
    const agentCtx = {
      workspaceId: 'ws-1',
      teamId: ENG_TEAM_UUID,
      teamName: 'Engineering',
      teamKey: 'ENG',
      teamSlug: 'team-engineering',
      defaultWorkflowStateId: BACKLOG_STATE_UUID,
      defaultEpicStatusId: PLANNED_EPIC_STATUS_UUID,
      completedWorkflowStateId: null,
      completedEpicStatusId: null,
      teams: [{ id: ENG_TEAM_UUID, name: 'Engineering', key: 'ENG', slug: 'team-engineering' }],
      workflowStates: [
        {
          id: BACKLOG_STATE_UUID,
          team_id: ENG_TEAM_UUID,
          name: 'Backlog',
          category: 'backlog' as const,
          position: 0,
          is_default: true,
        },
      ],
      epicStatuses: [{ id: PLANNED_EPIC_STATUS_UUID, name: 'Planned', category: 'planned' as const }],
    };

    const enriched = enrichToolInputWithWorkspaceContext('story_create', { title: 'bar' }, agentCtx);
    expect(enriched.team_id).toBe(ENG_TEAM_UUID);
  });
});
