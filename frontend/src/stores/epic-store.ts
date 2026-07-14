import type { Epic } from '@landi-flow/core/types';
import { BaseDomainStore } from './base-domain-store';

export interface EpicStoreState {
  epics: Epic[];
  selectedEpicId: string | null;
  loading: boolean;
  error: string | null;
}

const emptyState = (): EpicStoreState => ({
  epics: [],
  selectedEpicId: null,
  loading: false,
  error: null,
});

/** Epic store — strategic containers (HITM: Epic, never Project). */
class EpicStore extends BaseDomainStore<EpicStoreState> {
  private static instance: EpicStore;
  private state: EpicStoreState = emptyState();

  private constructor() {
    super();
  }

  static getInstance(): EpicStore {
    if (!EpicStore.instance) {
      EpicStore.instance = new EpicStore();
    }
    return EpicStore.instance;
  }

  protected getSnapshot(): EpicStoreState {
    return {
      epics: [...this.state.epics],
      selectedEpicId: this.state.selectedEpicId,
      loading: this.state.loading,
      error: this.state.error,
    };
  }

  hydrate(epics: Epic[]): void {
    this.state = {
      ...this.state,
      epics,
      loading: false,
      error: null,
    };
    this.notify();
  }

  upsertEpic(epic: Epic): void {
    const existingIndex = this.state.epics.findIndex((row) => row.id === epic.id);
    const epics =
      existingIndex >= 0
        ? this.state.epics.map((row, index) => (index === existingIndex ? epic : row))
        : [...this.state.epics, epic];
    this.state = { ...this.state, epics };
    this.notify();
  }

  removeEpic(epicId: string): void {
    this.state = {
      ...this.state,
      epics: this.state.epics.filter((epic) => epic.id !== epicId),
      selectedEpicId: this.state.selectedEpicId === epicId ? null : this.state.selectedEpicId,
    };
    this.notify();
  }

  getEpic(epicId: string): Epic | undefined {
    return this.state.epics.find((epic) => epic.id === epicId);
  }

  setEpics(epics: Epic[]): void {
    this.hydrate(epics);
  }

  selectEpic(epicId: string | null): void {
    this.state = { ...this.state, selectedEpicId: epicId };
    this.notify();
  }

  /**
   * Assign an Epic to members (optimistic). A human fills the lead slot; an AGENT fills
   * the delegate slot (a first-class assignee that can drive the Epic). Pass `null` to
   * unassign. Only the keys provided are changed, mirroring the `assign_epic` op.
   */
  assignEpic(
    epicId: string,
    input: { leadId?: string | null; delegateAgentId?: string | null },
  ): void {
    this.state = {
      ...this.state,
      epics: this.state.epics.map((epic) =>
        epic.id === epicId
          ? {
              ...epic,
              lead_id: 'leadId' in input ? (input.leadId ?? null) : epic.lead_id,
              delegate_agent_id:
                'delegateAgentId' in input
                  ? (input.delegateAgentId ?? null)
                  : epic.delegate_agent_id,
              updated_at: new Date().toISOString(),
            }
          : epic,
      ),
    };
    this.notify();
  }

  updateEpicDescription(epicId: string, descriptionMd: string): void {
    this.state = {
      ...this.state,
      epics: this.state.epics.map((epic) =>
        epic.id === epicId
          ? {
              ...epic,
              description_md: descriptionMd,
              updated_at: new Date().toISOString(),
            }
          : epic,
      ),
    };
    this.notify();
  }

  createEpic(input: {
    workspaceId: string;
    name: string;
    slug: string;
    statusId: string;
    descriptionMd?: string;
  }): Epic {
    const now = new Date().toISOString();
    const epic: Epic = {
      id: `epic-${crypto.randomUUID()}`,
      workspace_id: input.workspaceId,
      name: input.name,
      slug: input.slug,
      description_json: null,
      description_md: input.descriptionMd ?? null,
      status_id: input.statusId,
      priority: 'none',
      lead_id: null,
      delegate_agent_id: null,
      start_date: null,
      target_date: null,
      progress_cache: null,
      correlation_id: null,
      archived_at: null,
      created_at: now,
      updated_at: now,
    };
    this.state = {
      ...this.state,
      epics: [...this.state.epics, epic],
      selectedEpicId: epic.id,
    };
    this.notify();
    return epic;
  }

  setLoading(loading: boolean): void {
    this.state = { ...this.state, loading };
    this.notify();
  }

  setError(error: string | null): void {
    this.state = { ...this.state, error, loading: false };
    this.notify();
  }

  /** Clear all epics — used on soft workspace switch. */
  reset(): void {
    this.state = emptyState();
    this.notify();
  }
}

export const epicStore = EpicStore.getInstance();
export type { EpicStore };
