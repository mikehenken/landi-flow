import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityEvent, Story } from '@landi-flow/core/types';

const WORKSPACE_ID = '454e8fba-98cf-4097-b3b2-a40b72da10c2';
const TEAM_ID = '76752feb-127b-45b8-9675-7825aba12c41';
const STORY_ID = '0ba7ff75-2755-488b-8b09-59e673d96009';

const story: Story = {
  id: STORY_ID,
  workspace_id: WORKSPACE_ID,
  team_id: TEAM_ID,
  number: 25,
  identifier: 'GEN-25',
  title: 'Dual-Mode Real FX-001 Verify',
  description_json: null,
  description_md: null,
  workflow_state_id: '782a5125-4d10-42c0-87ee-2590f52bf015',
  priority: 'none',
  assignee_id: null,
  creator_id: null,
  follower_ids: [],
  delegate_agent_id: null,
  epic_id: null,
  milestone_id: null,
  cycle_id: null,
  estimate: null,
  due_date: null,
  sort_order: 0,
  is_draft: false,
  archived_at: null,
  correlation_id: null,
  created_at: '2026-07-09T07:15:20.643258+00:00',
  updated_at: '2026-07-09T07:57:06.404554+00:00',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('loadStoryActivity (production API path)', () => {
  const originalEnv = { ...process.env };
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_MOCK_AUTH: 'false',
    };
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it('requests team-scoped story activity under /api/v1 when mock auth is off', async () => {
    const activityEvent: ActivityEvent = {
      id: 'evt-1',
      workspace_id: WORKSPACE_ID,
      story_id: STORY_ID,
      epic_id: null,
      story_identifier: 'GEN-25',
      story_title: story.title,
      actor_type: 'user',
      actor_user_id: 'user-1',
      actor_agent_id: null,
      actor_name: 'Test User',
      event_type: 'story.updated',
      payload: {},
      correlation_id: 'corr-1',
      created_at: '2026-07-09T07:57:06.404554+00:00',
    };

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      const expected = `/api/v1/workspaces/${WORKSPACE_ID}/teams/${TEAM_ID}/stories/${STORY_ID}/activity`;
      expect(url).toContain(expected);
      return Promise.resolve(jsonResponse({ data: [activityEvent] }));
    });

    const { loadStoryActivity } = await import('./story-activity-controller');
    const events = await loadStoryActivity(story);

    expect(events).toHaveLength(1);
    expect(events[0]?.story_identifier).toBe('GEN-25');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
