import type { Story, StoryPriority } from '@landi-flow/core/types';
import { WORKFLOW_STATES } from '@/lib/workflow-states';
import { CURRENT_USER } from '@/lib/agent-roster';
import type { StoryDetailSectionId } from '@/lib/story/story-detail-sections';
import { BaseDomainStore } from './base-domain-store';

export interface StoryDetailFocus {
  section: StoryDetailSectionId | null;
  highlightedSignalId: string | null;
}

const emptyDetailFocus = (): StoryDetailFocus => ({
  section: null,
  highlightedSignalId: null,
});

const TEAM_IDENTIFIER_PREFIX = 'LAN';

export interface CreateStoryInput {
  title: string;
  descriptionMd?: string | null;
  workspaceId: string;
  teamId: string;
  workflowStateId?: string;
  priority?: StoryPriority;
  epicId?: string | null;
  assigneeId?: string | null;
  cycleId?: string | null;
  estimate?: number | null;
  dueDate?: string | null;
  followerIds?: string[];
  labelIds?: string[];
  isDraft?: boolean;
}

function generateStoryId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `story-${crypto.randomUUID()}`;
  }
  return `story-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface StoryStoreState {
  stories: Story[];
  selectedStoryId: string | null;
  detailFocus: StoryDetailFocus;
  loading: boolean;
  error: string | null;
}

const emptyState = (): StoryStoreState => ({
  stories: [],
  selectedStoryId: null,
  detailFocus: emptyDetailFocus(),
  loading: false,
  error: null,
});

/**
 * Story domain store — optimistic writes reconcile against server truth.
 * Mutations: compute next state → persist via controller → notify.
 *
 * Singleton is pinned on `globalThis` so webpack/OpenNext chunk duplicates
 * cannot hydrate one instance while list/detail subscribe to another.
 */
export const STORY_STORE_GLOBAL_KEY = '__landiFlowStoryStore' as const;

/** Window event so React hooks re-read the canonical singleton even if their
 * `subscribe()` landed on an orphaned duplicate instance (GATE 2 P0-1). */
export const STORY_STORE_CHANGE_EVENT = 'landi-flow-story-store-changed' as const;

type StoryStoreGlobal = typeof globalThis & {
  [STORY_STORE_GLOBAL_KEY]?: StoryStore;
};

class StoryStore extends BaseDomainStore<StoryStoreState> {
  private state: StoryStoreState = emptyState();

  private constructor() {
    super();
  }

  static getInstance(): StoryStore {
    const globalStore = globalThis as StoryStoreGlobal;
    const existing = globalStore[STORY_STORE_GLOBAL_KEY];
    if (existing) {
      return existing;
    }
    const created = new StoryStore();
    globalStore[STORY_STORE_GLOBAL_KEY] = created;
    return created;
  }

  /**
   * Re-assert this instance as the process-wide singleton.
   * Adopts listeners from any previously pinned orphan so hooks keep updating.
   */
  private pinGlobalSingleton(): void {
    const globalStore = globalThis as StoryStoreGlobal;
    const previous = globalStore[STORY_STORE_GLOBAL_KEY];
    if (previous && previous !== this) {
      this.adoptListenersFrom(previous);
      // Prefer the richer of the two story lists so a late pin cannot wipe hydrate.
      if (
        this.state.stories.length === 0 &&
        previous.getServerSnapshot().stories.length > 0
      ) {
        const prevSnap = previous.getServerSnapshot();
        this.state = {
          ...this.state,
          stories: prevSnap.stories,
          selectedStoryId: this.state.selectedStoryId ?? prevSnap.selectedStoryId,
          detailFocus: this.state.selectedStoryId
            ? this.state.detailFocus
            : prevSnap.detailFocus,
        };
      }
    }
    globalStore[STORY_STORE_GLOBAL_KEY] = this;
  }

  private emitChange(): void {
    this.pinGlobalSingleton();
    this.notify();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(STORY_STORE_CHANGE_EVENT));
    }
  }

  protected getSnapshot(): StoryStoreState {
    return {
      stories: [...this.state.stories],
      selectedStoryId: this.state.selectedStoryId,
      detailFocus: { ...this.state.detailFocus },
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
    this.emitChange();
  }

  setStories(stories: Story[]): void {
    this.hydrate(stories);
  }

  /**
   * Always attach listeners to the pinned global instance so OpenNext chunk
   * orphans cannot leave React subscribed to a silent duplicate.
   */
  override subscribe(listener: () => void): () => void {
    const canonical = StoryStore.getInstance();
    if (canonical !== this) {
      return canonical.subscribe(listener);
    }
    return super.subscribe(listener);
  }

  selectStory(storyId: string | null): void {
    const canonical = StoryStore.getInstance();
    if (canonical !== this) {
      canonical.selectStory(storyId);
      return;
    }
    this.state = {
      ...this.state,
      selectedStoryId: storyId,
      detailFocus: storyId ? this.state.detailFocus : emptyDetailFocus(),
    };
    this.emitChange();
  }

  openStoryDetail(storyId: string, focus: Partial<StoryDetailFocus> = {}): void {
    const canonical = StoryStore.getInstance();
    if (canonical !== this) {
      canonical.openStoryDetail(storyId, focus);
      return;
    }
    this.state = {
      ...this.state,
      selectedStoryId: storyId,
      detailFocus: {
        section: focus.section ?? null,
        highlightedSignalId: focus.highlightedSignalId ?? null,
      },
    };
    this.emitChange();
  }

  setDetailFocus(focus: Partial<StoryDetailFocus>): void {
    this.state = {
      ...this.state,
      detailFocus: {
        section: focus.section !== undefined ? focus.section : this.state.detailFocus.section,
        highlightedSignalId:
          focus.highlightedSignalId !== undefined
            ? focus.highlightedSignalId
            : this.state.detailFocus.highlightedSignalId,
      },
    };
    this.emitChange();
  }

  clearDetailFocus(): void {
    this.state = {
      ...this.state,
      detailFocus: emptyDetailFocus(),
    };
    this.emitChange();
  }

  /** Replace or insert a Story from server truth. */
  upsertStory(story: Story): void {
    const existingIndex = this.state.stories.findIndex((row) => row.id === story.id);
    const stories =
      existingIndex >= 0
        ? this.state.stories.map((row, index) => (index === existingIndex ? story : row))
        : [...this.state.stories, story];
    this.state = {
      ...this.state,
      stories,
      selectedStoryId: this.state.selectedStoryId ?? story.id,
    };
    this.emitChange();
  }

  removeStory(storyId: string): void {
    this.state = {
      ...this.state,
      stories: this.state.stories.filter((story) => story.id !== storyId),
      selectedStoryId:
        this.state.selectedStoryId === storyId ? null : this.state.selectedStoryId,
    };
    this.emitChange();
  }

  getStory(storyId: string): Story | undefined {
    return this.state.stories.find((story) => story.id === storyId);
  }

  /** Optimistic create for mock auth or pre-reconcile temp rows. */
  createStory(input: CreateStoryInput): Story {
    const now = new Date().toISOString();
    const nextNumber =
      this.state.stories.reduce((max, story) => Math.max(max, story.number), 0) + 1;

    const story: Story = {
      id: generateStoryId(),
      workspace_id: input.workspaceId,
      team_id: input.teamId,
      number: nextNumber,
      identifier: `${TEAM_IDENTIFIER_PREFIX}-${nextNumber}`,
      title: input.title,
      description_json: null,
      description_md: input.descriptionMd ?? null,
      workflow_state_id: input.workflowStateId ?? WORKFLOW_STATES.todo,
      priority: input.priority ?? 'none',
      assignee_id: input.assigneeId ?? null,
      creator_id: CURRENT_USER.id,
      follower_ids: input.followerIds ?? [],
      label_ids: input.labelIds ?? [],
      delegate_agent_id: null,
      epic_id: input.epicId ?? null,
      milestone_id: null,
      cycle_id: input.cycleId ?? null,
      estimate: input.estimate ?? null,
      due_date: input.dueDate ?? null,
      sort_order: nextNumber,
      is_draft: input.isDraft ?? false,
      archived_at: null,
      correlation_id: null,
      created_at: now,
      updated_at: now,
    };

    this.state = {
      ...this.state,
      stories: [...this.state.stories, story],
      selectedStoryId: story.id,
    };
    this.emitChange();
    return story;
  }

  updateStoryWorkflowState(storyId: string, workflowStateId: string): void {
    this.applyStoryPatch(storyId, { workflow_state_id: workflowStateId });
  }

  updateStoryPriority(storyId: string, priority: Story['priority']): void {
    this.applyStoryPatch(storyId, { priority });
  }

  updateStoryEpic(storyId: string, epicId: string | null): void {
    this.applyStoryPatch(storyId, { epic_id: epicId });
  }

  updateStoryMilestone(storyId: string, milestoneId: string | null): void {
    this.applyStoryPatch(storyId, { milestone_id: milestoneId });
  }

  updateStoryCycle(storyId: string, cycleId: string | null): void {
    this.applyStoryPatch(storyId, { cycle_id: cycleId });
  }

  updateStoryEstimate(storyId: string, estimate: number | null): void {
    this.applyStoryPatch(storyId, { estimate });
  }

  updateStoryDueDate(storyId: string, dueDate: string | null): void {
    this.applyStoryPatch(storyId, { due_date: dueDate });
  }

  updateStoryTeam(storyId: string, teamId: string): void {
    this.applyStoryPatch(storyId, { team_id: teamId });
  }

  /** Public patch for cross-module stores (milestones, cycles). */
  applyStoryPatchPublic(storyId: string, patch: Partial<Story>): void {
    this.applyStoryPatch(storyId, patch);
  }

  /** Shortcut Owner — assigned human (`assignee_id`). */
  setOwner(storyId: string, ownerId: string | null): void {
    this.applyStoryPatch(storyId, { assignee_id: ownerId });
  }

  /** Shortcut Followers — multi-select subscriber list. */
  setFollowers(storyId: string, followerIds: string[]): void {
    this.applyStoryPatch(storyId, { follower_ids: [...followerIds] });
  }

  /** Workspace story labels — multi-select catalog ids. */
  setLabelIds(storyId: string, labelIds: string[]): void {
    this.applyStoryPatch(storyId, { label_ids: [...labelIds] });
  }

  private applyStoryPatch(storyId: string, patch: Partial<Story>): void {
    this.state = {
      ...this.state,
      stories: this.state.stories.map((story) =>
        story.id === storyId
          ? {
              ...story,
              ...patch,
              updated_at: new Date().toISOString(),
            }
          : story,
      ),
    };
    this.emitChange();
  }

  updateStorySortOrder(storyId: string, sortOrder: number): void {
    this.state = {
      ...this.state,
      stories: this.state.stories.map((story) =>
        story.id === storyId
          ? {
              ...story,
              sort_order: sortOrder,
              updated_at: new Date().toISOString(),
            }
          : story,
      ),
    };
    this.emitChange();
  }

  /**
   * Assign a Story to members (optimistic). A human fills the assignee slot; an AGENT
   * fills the delegate slot — both first-class assignees. Pass `null` to unassign.
   * Only the keys provided are changed (tri-state), mirroring the `assign_story`
   * Action Bus op so this reconciles cleanly against server truth.
   */
  assignStory(
    storyId: string,
    input: { assigneeId?: string | null; delegateAgentId?: string | null },
  ): void {
    this.state = {
      ...this.state,
      stories: this.state.stories.map((story) =>
        story.id === storyId
          ? {
              ...story,
              assignee_id:
                'assigneeId' in input ? (input.assigneeId ?? null) : story.assignee_id,
              delegate_agent_id:
                'delegateAgentId' in input
                  ? (input.delegateAgentId ?? null)
                  : story.delegate_agent_id,
              updated_at: new Date().toISOString(),
            }
          : story,
      ),
    };
    this.emitChange();
  }

  publishStory(storyId: string): void {
    this.applyStoryPatch(storyId, { is_draft: false });
  }

  updateStoryDescription(storyId: string, descriptionMd: string): void {
    this.state = {
      ...this.state,
      stories: this.state.stories.map((story) =>
        story.id === storyId
          ? {
              ...story,
              description_md: descriptionMd,
              updated_at: new Date().toISOString(),
            }
          : story,
      ),
    };
    this.emitChange();
  }

  setLoading(loading: boolean): void {
    this.state = { ...this.state, loading };
    this.emitChange();
  }

  setError(error: string | null): void {
    this.state = { ...this.state, error, loading: false };
    this.emitChange();
  }

  /** Clear all stories — used on soft workspace switch. */
  reset(): void {
    this.state = emptyState();
    this.emitChange();
  }
}

/**
 * Always resolves `StoryStore.getInstance()` so module-level exports cannot
 * diverge from `globalThis.__landiFlowStoryStore` across chunk boundaries.
 */
function createStoryStoreAccessor(): StoryStore {
  return new Proxy({} as StoryStore, {
    get(_target, prop): unknown {
      const instance = StoryStore.getInstance();
      const value = Reflect.get(instance as object, prop, instance);
      if (typeof value === 'function') {
        return (value as (...args: unknown[]) => unknown).bind(instance);
      }
      return value;
    },
  });
}

export function getStoryStore(): StoryStore {
  return StoryStore.getInstance();
}

/**
 * Subscribe to the canonical story store and re-bind if the global singleton
 * identity changes. Also listens for {@link STORY_STORE_CHANGE_EVENT} so React
 * hooks update even when their initial `subscribe()` landed on an orphaned
 * duplicate instance (OpenNext chunk split / GATE 2 P0-1).
 */
export function subscribeStoryStore(onStoreChange: () => void): () => void {
  let unsub = getStoryStore().subscribe(onStoreChange);
  let pinned = getStoryStore();

  const rebindIfNeeded = (): void => {
    const canonical = getStoryStore();
    if (canonical !== pinned) {
      unsub();
      pinned = canonical;
      unsub = pinned.subscribe(onStoreChange);
    }
    onStoreChange();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(STORY_STORE_CHANGE_EVENT, rebindIfNeeded);
  }

  return () => {
    unsub();
    if (typeof window !== 'undefined') {
      window.removeEventListener(STORY_STORE_CHANGE_EVENT, rebindIfNeeded);
    }
  };
}

export const storyStore: StoryStore = createStoryStoreAccessor();
export type { StoryStore };
