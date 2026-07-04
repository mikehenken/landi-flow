import type { Story } from '@landi-flow/core/types';
import { BaseDomainStore } from './base-domain-store';

export interface StoryStoreState {
  stories: Story[];
  selectedStoryId: string | null;
  loading: boolean;
  error: string | null;
}

const emptyState = (): StoryStoreState => ({
  stories: [],
  selectedStoryId: null,
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
      selectedStoryId: this.state.selectedStoryId,
      loading: this.state.loading,
      error: this.state.error,
    };
  }

  hydrate(stories: Story[]): void {
    this.state = {
      ...this.state,
      stories,
      loading: false,
      error: null,
    };
    this.notify();
  }

  setStories(stories: Story[]): void {
    this.hydrate(stories);
  }

  selectStory(storyId: string | null): void {
    this.state = { ...this.state, selectedStoryId: storyId };
    this.notify();
  }

  updateStoryWorkflowState(storyId: string, workflowStateId: string): void {
    this.state = {
      ...this.state,
      stories: this.state.stories.map((story) =>
        story.id === storyId
          ? {
              ...story,
              workflow_state_id: workflowStateId,
              updated_at: new Date().toISOString(),
            }
          : story,
      ),
    };
    this.notify();
  }

  setLoading(loading: boolean): void {
    this.state = { ...this.state, loading };
    this.notify();
  }

  setError(error: string | null): void {
    this.state = { ...this.state, error, loading: false };
    this.notify();
  }
}

export const storyStore = StoryStore.getInstance();
export type { StoryStore };
