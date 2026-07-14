import { describe, expect, it } from 'vitest';
import {
  enrichToolInputWithWorkspaceContext,
  resolveEpicStatusId,
  resolveTeamIdFromRoster,
  resolveWorkflowStateId,
  slugifyEpicName,
  validateEnrichedToolInput,
  type AgentWorkspaceContext,
} from './index.js';

const DESIGN_TEAM_UUID = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890';
const ENG_TEAM_UUID = 'b2c3d4e5-f6a7-4901-bcde-f12345678901';
const DONE_STATE_UUID = 'c3d4e5f6-a7b8-4012-cdef-123456789012';
const BACKLOG_STATE_UUID = 'b1c2d3e4-f5a6-4789-bcde-ef1234567890';
const PLANNED_EPIC_STATUS_UUID = 'e5f6a7b8-c9d0-4123-ef01-345678901234';
const COMPLETED_EPIC_STATUS_UUID = 'd4e5f6a7-b8c9-4123-def0-234567890123';

const sampleContext: AgentWorkspaceContext = {
  workspaceId: 'ws-1',
  teamId: ENG_TEAM_UUID,
  teamName: 'Engineering',
  teamKey: 'ENG',
  teamSlug: 'team-engineering',
  defaultWorkflowStateId: BACKLOG_STATE_UUID,
  defaultEpicStatusId: PLANNED_EPIC_STATUS_UUID,
  completedWorkflowStateId: DONE_STATE_UUID,
  completedEpicStatusId: COMPLETED_EPIC_STATUS_UUID,
  teams: [
    { id: ENG_TEAM_UUID, name: 'Engineering', key: 'ENG', slug: 'team-engineering' },
    { id: DESIGN_TEAM_UUID, name: 'Design', key: 'DSN', slug: 'team-design' },
  ],
  workflowStates: [
    {
      id: BACKLOG_STATE_UUID,
      team_id: ENG_TEAM_UUID,
      name: 'Backlog',
      category: 'backlog',
      position: 0,
      is_default: true,
    },
    {
      id: DONE_STATE_UUID,
      team_id: ENG_TEAM_UUID,
      name: 'Done',
      category: 'completed',
      position: 2,
      is_default: false,
    },
  ],
  epicStatuses: [
    { id: PLANNED_EPIC_STATUS_UUID, name: 'Planned', category: 'planned' },
    { id: COMPLETED_EPIC_STATUS_UUID, name: 'Completed', category: 'completed' },
  ],
};

describe('resolveTeamIdFromRoster', () => {
  it('returns UUID when reference is already a team id', () => {
    expect(resolveTeamIdFromRoster(sampleContext.teams, ENG_TEAM_UUID)).toBe(ENG_TEAM_UUID);
  });

  it('resolves team slug to UUID', () => {
    expect(resolveTeamIdFromRoster(sampleContext.teams, 'team-design')).toBe(DESIGN_TEAM_UUID);
  });

  it('resolves route-style team ref when roster slug omits team- prefix', () => {
    const productionTeams = [
      { id: DESIGN_TEAM_UUID, name: 'Design', key: 'DSN', slug: 'design' },
    ];
    expect(resolveTeamIdFromRoster(productionTeams, 'team-design')).toBe(DESIGN_TEAM_UUID);
  });

  it('resolves team key to UUID (case-insensitive)', () => {
    expect(resolveTeamIdFromRoster(sampleContext.teams, 'dsn')).toBe(DESIGN_TEAM_UUID);
  });
});

describe('resolveWorkflowStateId', () => {
  it('resolves completion aliases to the completed workflow state', () => {
    expect(
      resolveWorkflowStateId(sampleContext.workflowStates, 'done', { intent: 'complete' }),
    ).toBe(DONE_STATE_UUID);
    expect(resolveWorkflowStateId(sampleContext.workflowStates, 'complete')).toBe(DONE_STATE_UUID);
  });

  it('resolves backlog alias', () => {
    expect(resolveWorkflowStateId(sampleContext.workflowStates, 'backlog')).toBe(BACKLOG_STATE_UUID);
  });
});

describe('resolveEpicStatusId', () => {
  it('resolves category slug backlog', () => {
    const backlogStatus = { id: 'status-backlog', name: 'Backlog', category: 'backlog' as const, slug: 'backlog' };
    expect(
      resolveEpicStatusId([backlogStatus, ...sampleContext.epicStatuses.map((s) => ({ ...s, slug: s.category }))], 'backlog'),
    ).toBe('status-backlog');
  });

  it('resolves completion aliases', () => {
    expect(
      resolveEpicStatusId(
        sampleContext.epicStatuses.map((s) => ({ ...s, slug: s.category })),
        'done',
      ),
    ).toBe(COMPLETED_EPIC_STATUS_UUID);
  });
});

describe('slugifyEpicName', () => {
  it('derives URL-safe slug from name', () => {
    expect(slugifyEpicName('My Cool Epic!')).toBe('my-cool-epic');
  });
});

describe('enrichToolInputWithWorkspaceContext', () => {
  it('story.create with title only injects team and default workflow state', () => {
    const enriched = enrichToolInputWithWorkspaceContext('story.create', { title: 'foo' }, sampleContext);
    expect(enriched).toEqual({
      title: 'foo',
      team_id: ENG_TEAM_UUID,
      workflow_state_id: BACKLOG_STATE_UUID,
    });
    expect(validateEnrichedToolInput('story.create', enriched)).toBeNull();
  });

  it('story.create accepts underscore alias tool name', () => {
    const enriched = enrichToolInputWithWorkspaceContext('story_create', { title: 'foo' }, sampleContext);
    expect(enriched.team_id).toBe(ENG_TEAM_UUID);
  });

  it('story.update maps done intent to completed workflow state', () => {
    const enriched = enrichToolInputWithWorkspaceContext(
      'story.update',
      { story_id: 'abc', team_id: ENG_TEAM_UUID, workflow_state_id: 'done' },
      sampleContext,
    );
    expect(enriched.workflow_state_id).toBe(DONE_STATE_UUID);
  });

  it('epic.create with name only injects slug and default status', () => {
    const enriched = enrichToolInputWithWorkspaceContext(
      'epic.create',
      { name: 'Launch v2' },
      sampleContext,
    );
    expect(enriched.slug).toBe('launch-v2');
    expect(enriched.status_id).toBe(PLANNED_EPIC_STATUS_UUID);
    expect(validateEnrichedToolInput('epic.create', enriched)).toBeNull();
  });

  it('resolves team slug on story.create', () => {
    const enriched = enrichToolInputWithWorkspaceContext(
      'story.create',
      { title: 'x', team_id: 'team-design' },
      {
        ...sampleContext,
        teams: [{ id: DESIGN_TEAM_UUID, name: 'Design', key: 'DSN', slug: 'design' }],
      },
    );
    expect(enriched.team_id).toBe(DESIGN_TEAM_UUID);
  });
});
