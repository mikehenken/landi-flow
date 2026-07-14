import { describe, expect, it, beforeEach } from 'vitest';
import type { Story } from '@landi-flow/core/types';
import { storyStore } from '@/stores/story-store';
import {
  buildStoryModalQueryString,
  openStoryModal,
  resolveStoryIdFromQuery,
} from './open-story-modal';

function makeStory(overrides: Partial<Story> & Pick<Story, 'id' | 'identifier'>): Story {
  return {
    workspace_id: 'd36ba4c7-1111-4111-8111-111111111111',
    number: 3,
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
    team_id: 'team-1',
    workflow_state_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    sort_order: 1000,
    is_draft: false,
    archived_at: null,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    correlation_id: null,
    ...overrides,
  };
}

describe('resolveStoryIdFromQuery', () => {
  const stories = [
    makeStory({ id: 'uuid-story-3', identifier: 'GEN-3' }),
    makeStory({ id: 'uuid-story-4', identifier: 'GEN-4', number: 4 }),
  ];

  it('resolves by identifier (case-insensitive)', () => {
    expect(resolveStoryIdFromQuery('GEN-3', stories)).toBe('uuid-story-3');
    expect(resolveStoryIdFromQuery('gen-3', stories)).toBe('uuid-story-3');
  });

  it('resolves by id', () => {
    expect(resolveStoryIdFromQuery('uuid-story-4', stories)).toBe('uuid-story-4');
  });

  it('returns null when unknown', () => {
    expect(resolveStoryIdFromQuery('GEN-99', stories)).toBeNull();
  });
});

describe('openStoryModal', () => {
  beforeEach(() => {
    storyStore.selectStory(null);
    storyStore.clearDetailFocus();
  });

  it('selects the story and applies detail focus', () => {
    openStoryModal('uuid-story-3', {
      section: 'signals',
      highlightedSignalId: 'sig-1',
    });
    const snapshot = storyStore.getServerSnapshot();
    expect(snapshot.selectedStoryId).toBe('uuid-story-3');
    expect(snapshot.detailFocus.section).toBe('signals');
    expect(snapshot.detailFocus.highlightedSignalId).toBe('sig-1');
  });
});

describe('buildStoryModalQueryString', () => {
  it('encodes identifier and optional section/signal', () => {
    const query = buildStoryModalQueryString(
      { identifier: 'GEN-3' },
      { section: 'comments', highlightedSignalId: 'sig-9' },
    );
    const params = new URLSearchParams(query);
    expect(params.get('story')).toBe('GEN-3');
    expect(params.get('section')).toBe('comments');
    expect(params.get('signal')).toBe('sig-9');
  });
});
