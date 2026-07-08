import { describe, expect, it } from 'vitest';
import type { Story } from '@landi-flow/core/types';
import { DEFAULT_STORY_DISPLAY_OPTIONS } from '@landi-flow/core/types';
import { processStoriesForView } from '@/lib/story-view-pipeline';

const sampleStories: Story[] = [
  {
    id: 'a',
    workspace_id: 'ws',
    team_id: 'team',
    number: 1,
    identifier: 'LAN-1',
    title: 'Alpha',
    description_json: null,
    description_md: null,
    workflow_state_id: 'state-done',
    priority: 'low',
    assignee_id: 'user-1',
    creator_id: null,
    follower_ids: [],
    delegate_agent_id: null,
    epic_id: null,
    milestone_id: null,
    cycle_id: null,
    estimate: null,
    due_date: null,
    sort_order: 2,
    is_draft: false,
    archived_at: null,
    correlation_id: null,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-02T00:00:00.000Z',
  },
  {
    id: 'b',
    workspace_id: 'ws',
    team_id: 'team',
    number: 2,
    identifier: 'LAN-2',
    title: 'Beta',
    description_json: null,
    description_md: null,
    workflow_state_id: 'state-todo',
    priority: 'urgent',
    assignee_id: null,
    creator_id: null,
    follower_ids: [],
    delegate_agent_id: null,
    epic_id: null,
    milestone_id: null,
    cycle_id: null,
    estimate: null,
    due_date: null,
    sort_order: 1,
    is_draft: false,
    archived_at: null,
    correlation_id: null,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-03T00:00:00.000Z',
  },
];

describe('processStoriesForView', () => {
  it('filters by status and sorts manually by sort_order', () => {
    const result = processStoriesForView(
      sampleStories,
      {
        op: 'and',
        conditions: [
          {
            id: '1',
            field: 'status',
            operator: 'is',
            values: ['todo'],
          },
        ],
      },
      '',
      DEFAULT_STORY_DISPLAY_OPTIONS,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('b');
  });

  it('applies search query across identifier and title', () => {
    const result = processStoriesForView(
      sampleStories,
      { op: 'and', conditions: [] },
      'alpha',
      DEFAULT_STORY_DISPLAY_OPTIONS,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.identifier).toBe('LAN-1');
  });
});
