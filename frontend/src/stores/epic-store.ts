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
