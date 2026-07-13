import { describe, expect, it } from 'vitest';
import type { Story } from '@landi-flow/core/types';
import { filterMyIssuesTab } from '@/lib/navigation/my-issues-queries';

function makeStory(overrides: Partial<Story>): Story {
  return {
    id: 'story-1',
    workspace_id: 'ws-1',
    team_id: 'team-1',
    identifier: 'GEN-1',
    number: 1,
    title: 'Test',
    description_md: null,
    description_json: null,
    workflow_state_id: 'state-todo',
    priority: 'none',
    estimate: null,
    sort_order: 1000,
    assignee_id: null,
    creator_id: 'creator-1',
    delegate_agent_id: null,
    epic_id: null,
    milestone_id: null,
    cycle_id: null,
    due_date: null,
    archived_at: null,
    is_draft: false,
    follower_ids: [],
    label_ids: [],
    correlation_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('filterMyIssuesTab', () => {
  const sessionUserId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  const stories: Story[] = [
    makeStory({
      id: 'a',
      identifier: 'GEN-1',
      assignee_id: sessionUserId,
      creator_id: 'other',
      follower_ids: [],
    }),
    makeStory({
      id: 'b',
      identifier: 'GEN-2',
      assignee_id: 'user-jane',
      creator_id: sessionUserId,
      follower_ids: [sessionUserId],
    }),
    makeStory({
      id: 'c',
      identifier: 'GEN-3',
      assignee_id: null,
      creator_id: 'other',
      follower_ids: ['user-jane'],
    }),
  ];

  it('filters Assigned by session user id, not demo user-jane', () => {
    const assigned = filterMyIssuesTab(stories, 'assigned', sessionUserId);
    expect(assigned.map((s) => s.id)).toEqual(['a']);
  });

  it('filters Created by session user id', () => {
    const created = filterMyIssuesTab(stories, 'created', sessionUserId);
    expect(created.map((s) => s.id)).toEqual(['b']);
  });

  it('filters Subscribed by session user id', () => {
    const subscribed = filterMyIssuesTab(stories, 'subscribed', sessionUserId);
    expect(subscribed.map((s) => s.id)).toEqual(['b']);
  });

  it('returns empty Assigned when currentUserId is missing', () => {
    expect(filterMyIssuesTab(stories, 'assigned', null)).toEqual([]);
    expect(filterMyIssuesTab(stories, 'assigned', undefined)).toEqual([]);
  });
});
