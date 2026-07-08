import { describe, expect, it } from 'vitest';
import { mapEpicRow, mapStoryRow } from './mappers';

describe('api mappers', () => {
  it('maps created_by to creator_id on stories', () => {
    const story = mapStoryRow({
      id: 'story-1',
      workspace_id: 'ws-1',
      team_id: 'team-1',
      number: 7,
      identifier: 'LAN-7',
      title: 'Persist me',
      description_json: null,
      description_md: 'hello',
      workflow_state_id: 'state-1',
      priority: 'high',
      assignee_id: 'user-1',
      delegate_agent_id: null,
      epic_id: null,
      milestone_id: null,
      cycle_id: null,
      estimate: null,
      due_date: null,
      sort_order: 1000,
      is_draft: false,
      archived_at: null,
      correlation_id: null,
      created_by: 'user-creator',
      created_at: '2026-07-06T00:00:00.000Z',
      updated_at: '2026-07-06T00:00:00.000Z',
    });

    expect(story.creator_id).toBe('user-creator');
    expect(story.follower_ids).toEqual([]);
    expect(story.identifier).toBe('LAN-7');
  });

  it('maps delegate_agent_id on epics', () => {
    const epic = mapEpicRow({
      id: 'epic-1',
      workspace_id: 'ws-1',
      name: 'Epic',
      slug: 'epic',
      description_json: null,
      description_md: null,
      status_id: 'status-1',
      priority: 'none',
      lead_id: null,
      delegate_agent_id: 'agent-1',
      start_date: null,
      target_date: null,
      progress_cache: null,
      correlation_id: null,
      archived_at: null,
      created_at: '2026-07-06T00:00:00.000Z',
      updated_at: '2026-07-06T00:00:00.000Z',
    });

    expect(epic.delegate_agent_id).toBe('agent-1');
  });
});
