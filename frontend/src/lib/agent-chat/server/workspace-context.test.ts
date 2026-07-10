import { describe, expect, it } from 'vitest';
import {
  buildWorkspaceSystemPromptSection,
  enrichToolInputWithWorkspaceContext,
  resolveTeamIdFromRoster,
  type AgentWorkspaceContext,
} from './workspace-context';

const DESIGN_TEAM_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const ENG_TEAM_UUID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

const sampleContext: AgentWorkspaceContext = {
  workspaceId: 'ws-1',
  teamId: ENG_TEAM_UUID,
  teamName: 'Engineering',
  teamKey: 'ENG',
  teamSlug: 'team-engineering',
  defaultWorkflowStateId: 'state-todo',
  teams: [
    { id: ENG_TEAM_UUID, name: 'Engineering', key: 'ENG', slug: 'team-engineering' },
    { id: DESIGN_TEAM_UUID, name: 'Design', key: 'DSN', slug: 'team-design' },
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

describe('agent workspace context', () => {
  it('builds a system prompt section with active team UUID and workflow_state_id', () => {
    const section = buildWorkspaceSystemPromptSection(sampleContext);
    expect(section).toContain(`team_id=\`${ENG_TEAM_UUID}\``);
    expect(section).toContain('Active team: Engineering');
    expect(section).toContain('workflow_state_id=`state-todo`');
    expect(section).toContain('Never ask the user for a team ID or workflow state ID');
    expect(section).toContain('never slug or key');
    expect(section).toContain(`Design · team_id=\`${DESIGN_TEAM_UUID}\``);
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

  it('injects team_id but not workflow_state_id for story.update', () => {
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

  it('ignores read tools', () => {
    const enriched = enrichToolInputWithWorkspaceContext(
      'flow.search',
      { query: 'LAN-1' },
      sampleContext,
    );
    expect(enriched).toEqual({ query: 'LAN-1' });
  });
});
