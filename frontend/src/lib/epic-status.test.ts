import { describe, expect, it } from 'vitest';
import type { Epic } from '@landi-flow/core/types';
import { EPIC_STATUS_IDS, getEpicStatusCategory } from '@/lib/epic-status';

const BACKLOG_UUID = 'a1111111-1111-4111-8111-111111111111';

function makeEpic(statusId: string): Epic {
  return {
    id: 'epic-1',
    workspace_id: 'ws-1',
    name: 'Test epic',
    slug: 'test-epic',
    description_json: null,
    description_md: null,
    status_id: statusId,
    priority: 'none',
    lead_id: null,
    delegate_agent_id: null,
    start_date: null,
    target_date: null,
    progress_cache: null,
    correlation_id: null,
    archived_at: null,
    created_at: '2026-07-13T00:00:00.000Z',
    updated_at: '2026-07-13T00:00:00.000Z',
  };
}

describe('getEpicStatusCategory', () => {
  it('maps mock slug status ids to categories', () => {
    expect(getEpicStatusCategory(makeEpic(EPIC_STATUS_IDS.planned))).toBe('planned');
  });

  it('maps production UUID status ids via roster lookup', () => {
    const roster = [
      { id: BACKLOG_UUID, name: 'Backlog', category: 'backlog' as const },
      { id: 'b2222222-2222-4222-8222-222222222222', name: 'Planned', category: 'planned' as const },
    ];
    expect(getEpicStatusCategory(makeEpic(BACKLOG_UUID), roster)).toBe('backlog');
  });
});
