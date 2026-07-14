import { describe, expect, it, beforeEach } from 'vitest';
import type { Story } from '@landi-flow/core/types';
import {
  STORY_STORE_GLOBAL_KEY,
  getStoryStore,
  storyStore,
} from '@/stores/story-store';

type StoryStoreGlobal = typeof globalThis & {
  [STORY_STORE_GLOBAL_KEY]?: {
    getServerSnapshot: () => {
      stories: Story[];
      selectedStoryId: string | null;
    };
  };
};

function probeGlobal(): {
  stories: Story[];
  selectedStoryId: string | null;
} | null {
  const globalStore = (globalThis as StoryStoreGlobal)[STORY_STORE_GLOBAL_KEY];
  return globalStore?.getServerSnapshot() ?? null;
}

function makeStory(id: string, identifier: string): Story {
  return {
    id,
    workspace_id: 'ws-1',
    team_id: 'team-1',
    number: 1,
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

describe('storyStore singleton', () => {
  beforeEach(() => {
    storyStore.hydrate([]);
    storyStore.selectStory(null);
  });

  it('pins the same instance on globalThis and getStoryStore()', () => {
    const viaGetter = getStoryStore();
    const viaGlobal = (globalThis as StoryStoreGlobal)[STORY_STORE_GLOBAL_KEY];
    expect(viaGlobal).toBe(viaGetter);
  });

  it('hydrate updates both storyStore accessor and globalThis probe', () => {
    const stories = [makeStory('id-gen-3', 'GEN-3'), makeStory('id-gen-1', 'GEN-1')];
    storyStore.hydrate(stories);

    expect(storyStore.getServerSnapshot().stories).toHaveLength(2);
    expect(probeGlobal()?.stories).toHaveLength(2);
    expect(getStoryStore().getServerSnapshot().stories[0]?.identifier).toBe('GEN-3');
  });

  it('openStoryDetail selection is visible on the global singleton', () => {
    storyStore.hydrate([makeStory('id-gen-3', 'GEN-3')]);
    storyStore.openStoryDetail('id-gen-3');

    expect(probeGlobal()?.selectedStoryId).toBe('id-gen-3');
    expect(storyStore.getServerSnapshot().selectedStoryId).toBe('id-gen-3');
  });

  it('re-pins globalThis after the key is cleared so detail shares hydrated stories', () => {
    delete (globalThis as StoryStoreGlobal)[STORY_STORE_GLOBAL_KEY];
    storyStore.hydrate([makeStory('id-gen-3', 'GEN-3'), makeStory('id-gen-4', 'GEN-4')]);

    expect(probeGlobal()?.stories).toHaveLength(2);
    expect(getStoryStore().getServerSnapshot().stories).toHaveLength(2);
    expect(getStoryStore()).toBe((globalThis as StoryStoreGlobal)[STORY_STORE_GLOBAL_KEY]);
  });

  it('adopts orphaned listeners when a later instance pins the singleton', () => {
    const first = getStoryStore();
    let notified = 0;
    first.subscribe(() => {
      notified += 1;
    });
    const initial = notified;

    // Create a second instance (cleared pin), then restore the orphan as the
    // "previous" global so hydrate/pin adopts its listeners — mirrors chunk split.
    delete (globalThis as StoryStoreGlobal)[STORY_STORE_GLOBAL_KEY];
    const second = getStoryStore();
    expect(second).not.toBe(first);
    (globalThis as StoryStoreGlobal)[STORY_STORE_GLOBAL_KEY] = first;

    second.hydrate([makeStory('id-gen-5', 'GEN-5')]);
    second.openStoryDetail('id-gen-5');

    expect(getStoryStore()).toBe(second);
    expect(probeGlobal()?.selectedStoryId).toBe('id-gen-5');
    expect(notified).toBeGreaterThan(initial);
  });

  it('dispatches a window change event on openStoryDetail', () => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
      // Node vitest pool has no DOM — browser event path covered by notify + adopt tests.
      return;
    }
    const events: string[] = [];
    const handler = (): void => {
      events.push('changed');
    };
    window.addEventListener('landi-flow-story-store-changed', handler);
    storyStore.hydrate([makeStory('id-gen-5', 'GEN-5')]);
    storyStore.openStoryDetail('id-gen-5');
    window.removeEventListener('landi-flow-story-store-changed', handler);
    expect(events.length).toBeGreaterThan(0);
  });
});
