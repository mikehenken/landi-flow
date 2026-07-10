import { describe, expect, it } from 'vitest';
import {
  buildWorkspaceSystemPromptSection,
  enrichToolInputWithWorkspaceContext,
  type AgentWorkspaceContext,
} from './workspace-context';

const sampleContext: AgentWorkspaceContext = {
  workspaceId: 'ws-1',
  teamId: 'team-1',
  teamName: 'Engineering',
  teamKey: 'ENG',
  defaultWorkflowStateId: 'state-todo',
  teams: [
    { id: 'team-1', name: 'Engineering', key: 'ENG' },
    { id: 'team-2', name: 'Design', key: 'DSN' },
  ],
};

describe('agent workspace context', () => {
  it('builds a system prompt section with active team_id', () => {
    const section = buildWorkspaceSystemPromptSection(sampleContext);
    expect(section).toContain('team_id=`team-1`');
    expect(section).toContain('Never ask the user for a team ID');
  });

  it('injects team_id into story.create when missing', () => {
    const enriched = enrichToolInputWithWorkspaceContext(
      'story.create',
      { title: 'Dark mode toggle' },
      sampleContext,
    );
    expect(enriched.team_id).toBe('team-1');
    expect(enriched.title).toBe('Dark mode toggle');
  });

  it('does not override an explicit team_id', () => {
    const enriched = enrichToolInputWithWorkspaceContext(
      'story.create',
      { title: 'X', team_id: 'team-2' },
      sampleContext,
    );
    expect(enriched.team_id).toBe('team-2');
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
