import { describe, expect, it } from 'vitest';
import type { Story, WorkflowState } from '@landi-flow/core/types';
import {
  resolveBoardTeamId,
  resolveBoardWorkflowStates,
  synthesizeWorkflowStatesFromStories,
} from './resolve-board-workflow-states';

function makeStory(overrides: Partial<Story> & Pick<Story, 'id' | 'workflow_state_id' | 'team_id'>): Story {
  return {
    workspace_id: 'd36ba4c7-1111-4111-8111-111111111111',
    identifier: 'GEN-1',
    number: 1,
    title: 'Test',
    description_json: null,
    description_md: null,
    priority: 'none',
    estimate: null,
    due_date: null,
    assignee_id: null,
    creator_id: null,
    follower_ids: [],
    label_ids: [],
    delegate_agent_id: null,
    epic_id: null,
    milestone_id: null,
    cycle_id: null,
    sort_order: 1000,
    is_draft: false,
    archived_at: null,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    correlation_id: null,
    ...overrides,
  };
}

describe('resolveBoardWorkflowStates', () => {
  it('keeps roster states when story status ids match', () => {
    const states: WorkflowState[] = [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        team_id: 'team-1',
        name: 'Todo',
        category: 'unstarted',
        position: 0,
        is_default: true,
      },
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        team_id: 'team-1',
        name: 'Done',
        category: 'completed',
        position: 1,
        is_default: false,
      },
    ];
    const stories = [
      makeStory({
        id: 's1',
        team_id: 'team-1',
        workflow_state_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      }),
    ];

    expect(resolveBoardWorkflowStates(stories, states)).toEqual(states);
  });

  it('synthesizes columns when roster ids do not match story statuses', () => {
    const states: WorkflowState[] = [
      {
        id: 'state-todo',
        team_id: 'team-design',
        name: 'Todo',
        category: 'unstarted',
        position: 0,
        is_default: true,
      },
    ];
    const stories = [
      makeStory({
        id: 's1',
        team_id: 'real-team',
        workflow_state_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      }),
      makeStory({
        id: 's2',
        team_id: 'real-team',
        workflow_state_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      }),
      makeStory({
        id: 's3',
        team_id: 'real-team',
        workflow_state_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      }),
    ];

    const resolved = resolveBoardWorkflowStates(stories, states);
    expect(resolved).toHaveLength(2);
    expect(resolved.map((state) => state.id).sort()).toEqual([
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    ].sort());
  });

  it('synthesizes from stories when roster is empty', () => {
    const stories = [
      makeStory({
        id: 's1',
        team_id: 'team-1',
        workflow_state_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      }),
    ];
    const resolved = synthesizeWorkflowStatesFromStories(stories);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.id).toBe('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
  });
});

describe('resolveBoardTeamId', () => {
  it('keeps default team when stories belong to it', () => {
    const stories = [
      makeStory({
        id: 's1',
        team_id: 'team-a',
        workflow_state_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      }),
    ];
    expect(resolveBoardTeamId(stories, 'team-a')).toBe('team-a');
  });

  it('picks the majority story team when default does not match', () => {
    const stories = [
      makeStory({
        id: 's1',
        team_id: 'team-b',
        workflow_state_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      }),
      makeStory({
        id: 's2',
        team_id: 'team-b',
        workflow_state_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      }),
      makeStory({
        id: 's3',
        team_id: 'team-c',
        workflow_state_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      }),
    ];
    expect(resolveBoardTeamId(stories, 'team-design')).toBe('team-b');
  });
});
