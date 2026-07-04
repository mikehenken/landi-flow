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

  setLoading(loading: boolean): void {
    this.state = { ...this.state, loading };
    this.notify();
  }

  setError(error: string | null): void {
    this.state = { ...this.state, error, loading: false };
    this.notify();
  }
}

export const epicStore = EpicStore.getInstance();
export type { EpicStore };
