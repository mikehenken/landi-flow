import { BaseDomainStore } from './base-domain-store';

export interface StorySelectionState {
  selectedIds: string[];
  lastSelectedId: string | null;
}

const emptyState = (): StorySelectionState => ({
  selectedIds: [],
  lastSelectedId: null,
});

/** Multi-select state for bulk actions (CAP-032). */
class StorySelectionStore extends BaseDomainStore<StorySelectionState> {
  private static instance: StorySelectionStore;
  private state: StorySelectionState = emptyState();

  private constructor() {
    super();
  }

  static getInstance(): StorySelectionStore {
    if (!StorySelectionStore.instance) {
      StorySelectionStore.instance = new StorySelectionStore();
    }
    return StorySelectionStore.instance;
  }

  protected getSnapshot(): StorySelectionState {
    return {
      selectedIds: [...this.state.selectedIds],
      lastSelectedId: this.state.lastSelectedId,
    };
  }

  clear(): void {
    this.state = emptyState();
    this.notify();
  }

  isSelected(storyId: string): boolean {
    return this.state.selectedIds.includes(storyId);
  }

  toggle(storyId: string): void {
    const exists = this.state.selectedIds.includes(storyId);
    this.state = {
      selectedIds: exists
        ? this.state.selectedIds.filter((id) => id !== storyId)
        : [...this.state.selectedIds, storyId],
      lastSelectedId: storyId,
    };
    this.notify();
  }

  selectRange(storyId: string, orderedStoryIds: readonly string[]): void {
    const anchorId = this.state.lastSelectedId ?? storyId;
    const anchorIndex = orderedStoryIds.indexOf(anchorId);
    const targetIndex = orderedStoryIds.indexOf(storyId);
    if (anchorIndex < 0 || targetIndex < 0) {
      this.toggle(storyId);
      return;
    }

    const start = Math.min(anchorIndex, targetIndex);
    const end = Math.max(anchorIndex, targetIndex);
    const rangeIds = orderedStoryIds.slice(start, end + 1);
    const merged = new Set([...this.state.selectedIds, ...rangeIds]);
    this.state = {
      selectedIds: [...merged],
      lastSelectedId: storyId,
    };
    this.notify();
  }

  selectAll(storyIds: readonly string[]): void {
    this.state = {
      selectedIds: [...storyIds],
      lastSelectedId: storyIds[storyIds.length - 1] ?? null,
    };
    this.notify();
  }
}

export const storySelectionStore = StorySelectionStore.getInstance();
