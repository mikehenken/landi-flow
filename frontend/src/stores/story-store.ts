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
    this.notify();
  }

  setStories(stories: Story[]): void {
    this.hydrate(stories);
  }

  selectStory(storyId: string | null): void {
    this.state = {
      ...this.state,
      selectedStoryId: storyId,
      detailFocus: storyId ? this.state.detailFocus : emptyDetailFocus(),
    };
    this.notify();
  }

  openStoryDetail(storyId: string, focus: Partial<StoryDetailFocus> = {}): void {
    this.state = {
      ...this.state,
      selectedStoryId: storyId,
      detailFocus: {
        section: focus.section ?? null,
        highlightedSignalId: focus.highlightedSignalId ?? null,
      },
    };
    this.notify();
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
    this.notify();
  }

  clearDetailFocus(): void {
    this.state = {
      ...this.state,
      detailFocus: emptyDetailFocus(),
    };
    this.notify();
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
    this.notify();
  }

  removeStory(storyId: string): void {
    this.state = {
      ...this.state,
      stories: this.state.stories.filter((story) => story.id !== storyId),
      selectedStoryId:
        this.state.selectedStoryId === storyId ? null : this.state.selectedStoryId,
    };
    this.notify();
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
      assignee_id: null,
      creator_id: CURRENT_USER.id,
      follower_ids: [],
      delegate_agent_id: null,
      epic_id: input.epicId ?? null,
      milestone_id: null,
      cycle_id: null,
      estimate: null,
      due_date: null,
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
    this.notify();
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
    this.notify();
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
    this.notify();
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
    this.notify();
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
