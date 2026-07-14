import { describe, expect, it } from 'vitest';
import { EPIC_STATUS_IDS } from '@/lib/epic-status';
import { resolveEpicStatusId } from '@/lib/resolve-epic-status-id';

const BACKLOG_UUID = 'a1111111-1111-4111-8111-111111111111';
const PLANNED_UUID = 'b2222222-2222-4222-8222-222222222222';
const COMPLETED_UUID = 'c3333333-3333-4333-8333-333333333333';

const roster = [
  { id: BACKLOG_UUID, name: 'Backlog', category: 'backlog' as const },
  { id: PLANNED_UUID, name: 'Planned', category: 'planned' as const },
  { id: COMPLETED_UUID, name: 'Completed', category: 'completed' as const },
];

describe('resolveEpicStatusId', () => {
  it('returns UUID when reference is already a status id', () => {
    expect(resolveEpicStatusId(roster, PLANNED_UUID)).toBe(PLANNED_UUID);
  });

  it('resolves mock slug epic-status-backlog to roster UUID by category', () => {
    expect(resolveEpicStatusId(roster, EPIC_STATUS_IDS.backlog)).toBe(BACKLOG_UUID);
  });

  it('resolves mock slug epic-status-planned to roster UUID by category', () => {
    expect(resolveEpicStatusId(roster, EPIC_STATUS_IDS.planned)).toBe(PLANNED_UUID);
  });

  it('resolves epic status by name', () => {
    expect(resolveEpicStatusId(roster, 'Planned')).toBe(PLANNED_UUID);
  });

  it('resolves completion aliases to the completed epic status', () => {
    expect(resolveEpicStatusId(roster, 'done')).toBe(COMPLETED_UUID);
  });

  it('uses defaultStatusId when intent is default and reference is empty', () => {
    expect(
      resolveEpicStatusId(roster, null, { intent: 'default', defaultStatusId: PLANNED_UUID }),
    ).toBe(PLANNED_UUID);
  });
});
