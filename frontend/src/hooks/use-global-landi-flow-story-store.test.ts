import { describe, expect, it, beforeEach } from 'vitest';
import type { Story } from '@landi-flow/core/types';
import {
  STORY_STORE_CHANGE_EVENT,
  STORY_STORE_GLOBAL_KEY,
  storyStore,
  type StoryStoreState,
} from '@/stores/story-store';
import {
  readPinnedLandiFlowStorySnapshot,
} from './use-global-landi-flow-story-store';
import { deriveStoryDetailHostVisibility } from '@/lib/story/story-detail-host-visibility';

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

describe('useGlobalLandiFlowStoryStore contract', () => {
  beforeEach(() => {
    storyStore.hydrate([]);
    storyStore.selectStory(null);
  });

  it('readPinnedLandiFlowStorySnapshot follows window.__landiFlowStoryStore only', () => {
    storyStore.hydrate([makeStory('id-gen-5', 'GEN-5')]);
    storyStore.selectStory('id-gen-5');

    const fromGlobal = (
      globalThis as typeof globalThis & {
        [STORY_STORE_GLOBAL_KEY]?: {
          getServerSnapshot: () => StoryStoreState;
        };
      }
    )[STORY_STORE_GLOBAL_KEY]?.getServerSnapshot();

    const fromHelper = readPinnedLandiFlowStorySnapshot();
    expect(fromHelper.selectedStoryId).toBe('id-gen-5');
    expect(fromHelper.selectedStoryId).toBe(fromGlobal?.selectedStoryId ?? null);

    const hostFlags = deriveStoryDetailHostVisibility(fromHelper);
    expect(hostFlags.showPortal).toBe(true);
  });

  it('dispatches landi-flow-story-store-changed so force setState path can re-read', () => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
      storyStore.selectStory('id-gen-5');
      expect(readPinnedLandiFlowStorySnapshot().selectedStoryId).toBe('id-gen-5');
      return;
    }

    let eventCount = 0;
    const onChange = (): void => {
      eventCount += 1;
    };
    window.addEventListener(STORY_STORE_CHANGE_EVENT, onChange);
    storyStore.hydrate([makeStory('id-gen-5', 'GEN-5')]);
    storyStore.selectStory('id-gen-5');
    window.removeEventListener(STORY_STORE_CHANGE_EVENT, onChange);

    expect(eventCount).toBeGreaterThan(0);
    expect(deriveStoryDetailHostVisibility(readPinnedLandiFlowStorySnapshot()).showPortal).toBe(
      true,
    );
  });
});
