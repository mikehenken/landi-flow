import type { Epic } from '@landi-flow/core/types';
import { BaseDomainStore } from './base-domain-store.js';

export interface EpicStoreState {
  epics: Epic[];
  loading: boolean;
  error: string | null;
}

const emptyState = (): EpicStoreState => ({
  epics: [],
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
      loading: this.state.loading,
      error: this.state.error,
    };
  }

  setEpics(epics: Epic[]): void {
    this.state = { ...this.state, epics, loading: false, error: null };
    this.notify();
  }
}

export const epicStore = EpicStore.getInstance();
export type { EpicStore };
