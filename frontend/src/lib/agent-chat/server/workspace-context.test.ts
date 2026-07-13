import { describe, expect, it } from 'vitest';
import { EPIC_STATUS_IDS } from '@/lib/epic-status';
import {
  buildWorkspaceSystemPromptSection,
  enrichToolInputWithWorkspaceContext,
  resolveEpicStatusId,
  resolveTeamIdFromRoster,
  resolveWorkflowStateId,
  validateEnrichedToolInput,
  type AgentWorkspaceContext,
} from './workspace-context';

const DESIGN_TEAM_UUID = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890';
const ENG_TEAM_UUID = 'b2c3d4e5-f6a7-4901-bcde-f12345678901';
const DONE_STATE_UUID = 'c3d4e5f6-a7b8-4012-cdef-123456789012';
const COMPLETED_EPIC_STATUS_UUID = 'd4e5f6a7-b8c9-4123-def0-234567890123';

const sampleContext: AgentWorkspaceContext = {
  workspaceId: 'ws-1',
  teamId: ENG_TEAM_UUID,
  teamName: 'Engineering',
  teamKey: 'ENG',
  teamSlug: 'team-engineering',
  defaultWorkflowStateId: 'state-todo',
  defaultEpicStatusId: EPIC_STATUS_IDS.planned,
  completedWorkflowStateId: DONE_STATE_UUID,
  completedEpicStatusId: COMPLETED_EPIC_STATUS_UUID,
  teams: [
    { id: ENG_TEAM_UUID, name: 'Engineering', key: 'ENG', slug: 'team-engineering' },
    { id: DESIGN_TEAM_UUID, name: 'Design', key: 'DSN', slug: 'team-design' },
  ],
  workflowStates: [
    {
      id: 'state-todo',
      team_id: ENG_TEAM_UUID,
      name: 'Todo',
      category: 'unstarted',
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
    { id: EPIC_STATUS_IDS.planned, name: 'Planned', category: 'planned' },
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

  it('resolves team key to UUID (case-insensitive)', () => {
    expect(resolveTeamIdFromRoster(sampleContext.teams, 'dsn')).toBe(DESIGN_TEAM_UUID);
  });

  it('returns reference unchanged when roster has no match', () => {
    expect(resolveTeamIdFromRoster(sampleContext.teams, 'team-unknown')).toBe('team-unknown');
  });
});

describe('resolveWorkflowStateId', () => {
  it('resolves completion aliases to the completed workflow state', () => {
    expect(
      resolveWorkflowStateId(sampleContext.workflowStates, 'done', { intent: 'complete' }),
    ).toBe(DONE_STATE_UUID);
    expect(resolveWorkflowStateId(sampleContext.workflowStates, 'complete')).toBe(DONE_STATE_UUID);
  });

  it('resolves workflow state by name', () => {
    expect(resolveWorkflowStateId(sampleContext.workflowStates, 'Todo')).toBe('state-todo');
  });
});

describe('resolveEpicStatusId', () => {
  it('resolves completion aliases to the completed epic status', () => {
    expect(resolveEpicStatusId(sampleContext.epicStatuses, 'done')).toBe(
      COMPLETED_EPIC_STATUS_UUID,
    );
  });

  it('resolves epic status by name', () => {
    expect(resolveEpicStatusId(sampleContext.epicStatuses, 'Planned')).toBe(
      EPIC_STATUS_IDS.planned,
    );
  });
});

describe('agent workspace context', () => {
  it('builds a system prompt section with active team UUID and workflow_state_id', () => {
    const section = buildWorkspaceSystemPromptSection(sampleContext);
    expect(section).toContain(`team_id=\`${ENG_TEAM_UUID}\``);
    expect(section).toContain('Active team: Engineering');
    expect(section).toContain('workflow_state_id=`state-todo`');
    expect(section).toContain('Never ask the user for a team ID');
    expect(section).toContain(`Design · team_id=\`${DESIGN_TEAM_UUID}\``);
    expect(section).toContain('mark a **Story** complete');
    expect(section).toContain('mark an **Epic** complete');
  });

  it('injects team_id and workflow_state_id into story.create when missing', () => {
    const enriched = enrichToolInputWithWorkspaceContext(
      'story.create',
      { title: 'Dark mode toggle' },
      sampleContext,
    );
    expect(enriched.team_id).toBe(ENG_TEAM_UUID);
    expect(enriched.workflow_state_id).toBe('state-todo');
    expect(enriched.title).toBe('Dark mode toggle');
  });

  it('resolves slug team_id to UUID for story.create', () => {
    const enriched = enrichToolInputWithWorkspaceContext(
      'story.create',
      { title: 'X', team_id: 'team-design' },
      sampleContext,
    );
    expect(enriched.team_id).toBe(DESIGN_TEAM_UUID);
    expect(enriched.workflow_state_id).toBe('state-todo');
  });

  it('resolves key team_id to UUID for story.create', () => {
    const enriched = enrichToolInputWithWorkspaceContext(
      'story.create',
      { title: 'X', team_id: 'DSN' },
      sampleContext,
    );
    expect(enriched.team_id).toBe(DESIGN_TEAM_UUID);
  });

  it('does not override an explicit UUID team_id', () => {
    const enriched = enrichToolInputWithWorkspaceContext(
      'story.create',
      { title: 'X', team_id: DESIGN_TEAM_UUID },
      sampleContext,
    );
    expect(enriched.team_id).toBe(DESIGN_TEAM_UUID);
    expect(enriched.workflow_state_id).toBe('state-todo');
  });

  it('does not override an explicit workflow_state_id', () => {
    const enriched = enrichToolInputWithWorkspaceContext(
      'story.create',
      { title: 'X', workflow_state_id: 'state-in-progress' },
      sampleContext,
    );
    expect(enriched.team_id).toBe(ENG_TEAM_UUID);
    expect(enriched.workflow_state_id).toBe('state-in-progress');
  });

  it('injects team_id but not workflow_state_id for story.update without state change', () => {
    const enriched = enrichToolInputWithWorkspaceContext(
      'story.update',
      { story_id: 'story-1', title: 'Updated title' },
      sampleContext,
    );
    expect(enriched.team_id).toBe(ENG_TEAM_UUID);
    expect(enriched.workflow_state_id).toBeUndefined();
  });

  it('resolves slug team_id for story.update', () => {
    const enriched = enrichToolInputWithWorkspaceContext(
      'story.update',
      { story_id: 'story-1', team_id: 'team-design', title: 'Updated title' },
      sampleContext,
    );
    expect(enriched.team_id).toBe(DESIGN_TEAM_UUID);
  });

  it('resolves mark-story-complete via workflow_state_id alias', () => {
    const enriched = enrichToolInputWithWorkspaceContext(
      'story.update',
      { story_id: 'story-1', workflow_state_id: 'done' },
      sampleContext,
    );
    expect(enriched.workflow_state_id).toBe(DONE_STATE_UUID);
  });

  it('maps completion status to workflow_state_id instead of priority for story.update', () => {
    const enriched = enrichToolInputWithWorkspaceContext(
      'story.update',
      { story_id: 'story-1', status: 'done', priority: 'high' },
      sampleContext,
    );
    expect(enriched.workflow_state_id).toBe(DONE_STATE_UUID);
    expect(enriched.priority).toBe('high');
  });

  it('removes mistaken priority alias when completion intent is present', () => {
    const enriched = enrichToolInputWithWorkspaceContext(
      'story.update',
      { story_id: 'story-1', status: 'complete', priority: 'done' },
      sampleContext,
    );
    expect(enriched.workflow_state_id).toBe(DONE_STATE_UUID);
    expect(enriched.priority).toBeUndefined();
  });

  it('resolves mark-epic-complete via epic.update status alias', () => {
    const enriched = enrichToolInputWithWorkspaceContext(
      'epic.update',
      { epic_id: 'epic-1', status: 'complete' },
      sampleContext,
    );
    expect(enriched.status_id).toBe(COMPLETED_EPIC_STATUS_UUID);
  });

  it('ignores read tools', () => {
    const enriched = enrichToolInputWithWorkspaceContext(
      'flow.search',
      { query: 'LAN-1' },
      sampleContext,
    );
    expect(enriched).toEqual({ query: 'LAN-1' });
  });
});

describe('validateEnrichedToolInput', () => {
  it('rejects unresolved team slug before MCP call', () => {
    const error = validateEnrichedToolInput('story.update', {
      team_id: 'team-design',
      story_id: 'story-1',
    });
    expect(error).toContain('team_id "team-design" is not a UUID');
  });

  it('accepts resolved UUID team_id and story_id', () => {
    const error = validateEnrichedToolInput('story.update', {
      team_id: DESIGN_TEAM_UUID,
      story_id: 'e5f6a7b8-c9d0-4123-a456-426614174000',
    });
    expect(error).toBeNull();
  });

  it('rejects unresolved story identifier', () => {
    const error = validateEnrichedToolInput('story.update', {
      team_id: ENG_TEAM_UUID,
      story_id: 'LAN-2',
    });
    expect(error).toContain('story_id "LAN-2" is not a UUID');
  });
});
