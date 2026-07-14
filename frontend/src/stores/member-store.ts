import type { WorkspaceMemberRole, WorkspaceMemberStatus } from '@landi-flow/core/types';
import type { WorkspaceMemberWithProfile } from '@/lib/api/types';
import { BaseDomainStore } from './base-domain-store';

export interface MemberStoreState {
  members: WorkspaceMemberWithProfile[];
  loading: boolean;
  error: string | null;
}

const emptyState = (): MemberStoreState => ({
  members: [],
  loading: false,
  error: null,
});

class MemberStore extends BaseDomainStore<MemberStoreState> {
  private static instance: MemberStore;
  private state: MemberStoreState = emptyState();

  private constructor() {
    super();
  }

  static getInstance(): MemberStore {
    if (!MemberStore.instance) {
      MemberStore.instance = new MemberStore();
    }
    return MemberStore.instance;
  }

  protected getSnapshot(): MemberStoreState {
    return {
      members: [...this.state.members],
      loading: this.state.loading,
      error: this.state.error,
    };
  }

  hydrate(members: WorkspaceMemberWithProfile[]): void {
    this.state = { ...this.state, members, loading: false, error: null };
    this.notify();
  }

  upsertMember(member: WorkspaceMemberWithProfile): void {
    const existingIndex = this.state.members.findIndex((row) => row.id === member.id);
    const members =
      existingIndex >= 0
        ? this.state.members.map((row, index) => (index === existingIndex ? member : row))
        : [...this.state.members, member];
    this.state = { ...this.state, members };
    this.notify();
  }

  removeMember(memberId: string): void {
    this.state = {
      ...this.state,
      members: this.state.members.filter((row) => row.id !== memberId),
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

  /** Clear members — used on soft workspace switch. */
  reset(): void {
    this.state = emptyState();
    this.notify();
  }
}

export const memberStore = MemberStore.getInstance();
export type { WorkspaceMemberRole, WorkspaceMemberStatus };
