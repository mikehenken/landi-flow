import { describe, expect, it } from 'vitest';
import type { Epic, Story, WorkflowState } from '@landi-flow/core/types';
import {
  epicToInitialStorage,
  hydrateBoardRoom,
  hydrateEpicRoom,
  hydrateStoryRoom,
  storiesToBoardStorage,
  storyToInitialStorage,
} from './hydration';

const sampleStory: Story = {
  id: 'story-1',
  workspace_id: 'ws-1',
  team_id: 'team-1',
  number: 1,
  identifier: 'LAN-1',
  title: 'Test Story',
  description_json: null,
  description_md: '# Hello',
  workflow_state_id: 'state-todo',
  priority: 'high',
  assignee_id: 'user-1',
  creator_id: 'user-1',
  follower_ids: [],
  delegate_agent_id: 'agent-1',
  epic_id: null,
  milestone_id: null,
  cycle_id: null,
  estimate: null,
  due_date: null,
  sort_order: 100,
  is_draft: false,
  archived_at: null,
  correlation_id: null,
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
};

const sampleEpic: Epic = {
  id: 'epic-1',
  workspace_id: 'ws-1',
  name: 'Epic One',
  slug: 'epic-one',
  description_json: null,
  description_md: null,
  status_id: 'status-1',
  priority: 'medium',
  lead_id: 'user-2',
  delegate_agent_id: null,
  start_date: null,
  target_date: '2026-08-01',
  progress_cache: null,
  correlation_id: null,
  archived_at: null,
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
};

describe('storyToInitialStorage', () => {
  it('maps story columns to LiveObject fields', () => {
    const storage = storyToInitialStorage(sampleStory);
    expect(storage.fields.title).toBe('Test Story');
    expect(storage.fields.delegateAgentId).toBe('agent-1');
    expect(storage.labels).toEqual([]);
  });
});

describe('epicToInitialStorage', () => {
  it('includes story order', () => {
    const storage = epicToInitialStorage(sampleEpic, ['story-1', 'story-2']);
    expect(storage.summary.name).toBe('Epic One');
    expect(storage.storyOrder).toEqual(['story-1', 'story-2']);
  });
});

describe('storiesToBoardStorage', () => {
  it('groups stories by workflow state', () => {
    const states: WorkflowState[] = [
      { id: 'state-todo', team_id: 'team-1', name: 'Todo', category: 'unstarted', position: 0, is_default: true },
      { id: 'state-done', team_id: 'team-1', name: 'Done', category: 'completed', position: 1, is_default: false },
    ];
    const stories: Story[] = [
      { ...sampleStory, id: 's1', workflow_state_id: 'state-todo', sort_order: 1 },
      { ...sampleStory, id: 's2', workflow_state_id: 'state-done', sort_order: 2 },
    ];
    const board = storiesToBoardStorage(stories, states);
    expect(board.columns[0]?.cards).toEqual(['s1']);
    expect(board.columns[1]?.cards).toEqual(['s2']);
  });
});

describe('hydrate* helpers', () => {
  it('hydrates story room with room id', () => {
    const hydrated = hydrateStoryRoom(sampleStory);
    expect(hydrated.roomId).toBe('linear_clone:ws-1:story:story-1');
    expect(hydrated.story.id).toBe('story-1');
  });

  it('hydrates epic and board rooms', () => {
    const epicRoom = hydrateEpicRoom(sampleEpic, []);
    expect(epicRoom.roomId).toContain('epic:epic-1');

    const boardRoom = hydrateBoardRoom('ws-1', 'team-1', [sampleStory], []);
    expect(boardRoom.roomId).toContain('board:team-1');
  });
});
