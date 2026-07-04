import type { Story } from '@landi-flow/core/types';
import { BaseDomainStore } from './base-domain-store.js';

export interface StoryStoreState {
  stories: Story[];
  loading: boolean;
  error: string | null;
}

const emptyState = (): StoryStoreState => ({
  stories: [],
  loading: false,
  error: null,
});

/**
 * Story domain store — optimistic writes reconcile against server truth.
 * Mutations: compute next state → persist via controller → notify.
 */
class StoryStore extends BaseDomainStore<StoryStoreState> {
  private static instance: StoryStore;
  private state: StoryStoreState = emptyState();

  private constructor() {
    super();
  }

  static getInstance(): StoryStore {
    if (!StoryStore.instance) {
      StoryStore.instance = new StoryStore();
    }
    return StoryStore.instance;
  }

  protected getSnapshot(): StoryStoreState {
    return {
      stories: [...this.state.stories],
      loading: this.state.loading,
      error: this.state.error,
    };
  }

  /** Placeholder — wired to story-controller in Phase 09. */
  setStories(stories: Story[]): void {
    this.state = { ...this.state, stories, loading: false, error: null };
    this.notify();
  }
}

export const storyStore = StoryStore.getInstance();
export type { StoryStore };
