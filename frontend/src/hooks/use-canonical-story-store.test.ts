import { describe, expect, it, beforeEach } from 'vitest';
import type { Story } from '@landi-flow/core/types';
import {
  STORY_STORE_GLOBAL_KEY,
  storyStore,
} from '@/stores/story-store';
import { readGlobalStorySnapshot } from './use-canonical-story-store';

function makeStory(id: string, identifier: string): Story {
  return {
    id,
    workspace_id: 'ws-1',
    team_id: 'team-1',
    number: 5,
    identifier,
    title: `Title ${identifier}`,
    description_json: null,
    description_md: null,
    workflow_state_id: 'todo',
    priority: 'none',
    assignee_id: null,
    creator_id: 'user-1',
    follower_ids: [],
    label_ids: [],
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
    created_at: '2026-07-13T00:00:00.000Z',
    updated_at: '2026-07-13T00:00:00.000Z',
  };
}

describe('readGlobalStorySnapshot', () => {
  beforeEach(() => {
    storyStore.hydrate([]);
    storyStore.selectStory(null);
  });

  it('matches window/global selection after openStoryDetail', () => {
    storyStore.hydrate([makeStory('id-gen-5', 'GEN-5')]);
    storyStore.openStoryDetail('id-gen-5');

    const fromHookHelper = readGlobalStorySnapshot();
    const fromGlobal = (
      globalThis as typeof globalThis & {
        [STORY_STORE_GLOBAL_KEY]?: { getServerSnapshot: () => { selectedStoryId: string | null } };
      }
    )[STORY_STORE_GLOBAL_KEY]?.getServerSnapshot();

    expect(fromHookHelper.selectedStoryId).toBe('id-gen-5');
    expect(fromGlobal?.selectedStoryId).toBe('id-gen-5');
    expect(fromHookHelper.selectedStoryId).toBe(fromGlobal?.selectedStoryId ?? null);
  });
});
