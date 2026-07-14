import { describe, expect, it, beforeEach } from 'vitest';
import type { Story } from '@landi-flow/core/types';
import {
  STORY_STORE_GLOBAL_KEY,
  storyStore,
  type StoryStoreState,
} from '@/stores/story-store';
import { readPinnedLandiFlowStorySnapshot } from '@/hooks/use-global-landi-flow-story-store';
import {
  deriveStoryDetailHostVisibility,
  resolveStoryBySelection,
} from './story-detail-host-visibility';

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

describe('deriveStoryDetailHostVisibility', () => {
  beforeEach(() => {
    storyStore.hydrate([]);
    storyStore.selectStory(null);
  });

  it('sets showPortal true when __landiFlowStoryStore selection is set', () => {
    storyStore.hydrate([makeStory('id-gen-5', 'GEN-5')]);
    storyStore.selectStory('id-gen-5');

    const pinned = (
      globalThis as typeof globalThis & {
        [STORY_STORE_GLOBAL_KEY]?: {
          getServerSnapshot: () => StoryStoreState;
        };
      }
    )[STORY_STORE_GLOBAL_KEY];

    expect(pinned).toBeDefined();
    const globalSnap = pinned!.getServerSnapshot();
    expect(globalSnap.selectedStoryId).toBe('id-gen-5');

    const visibility = deriveStoryDetailHostVisibility(globalSnap);
    expect(visibility.showPortal).toBe(true);
    expect(visibility.selectedStoryId).toBe('id-gen-5');
    expect(visibility.resolvedIdentifier).toBe('GEN-5');
    expect(resolveStoryBySelection(globalSnap.stories, visibility.selectedStoryId)?.id).toBe(
      'id-gen-5',
    );
  });

  it('matches readPinnedLandiFlowStorySnapshot after openStoryDetail', () => {
    storyStore.hydrate([makeStory('id-gen-5', 'GEN-5')]);
    storyStore.openStoryDetail('id-gen-5');

    const fromPinnedHelper = readPinnedLandiFlowStorySnapshot();
    const visibility = deriveStoryDetailHostVisibility(fromPinnedHelper);

    expect(fromPinnedHelper.selectedStoryId).toBe('id-gen-5');
    expect(visibility.showPortal).toBe(true);
    expect(visibility.resolvedIdentifier).toBe('GEN-5');
  });

  it('keeps showPortal false when selection is null', () => {
    storyStore.hydrate([makeStory('id-gen-5', 'GEN-5')]);
    storyStore.selectStory(null);
    const visibility = deriveStoryDetailHostVisibility(readPinnedLandiFlowStorySnapshot());
    expect(visibility.showPortal).toBe(false);
    expect(visibility.selectedStoryId).toBeNull();
  });
});
