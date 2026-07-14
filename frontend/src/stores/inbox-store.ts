import type { ActivityEvent, InboxNotification } from '@landi-flow/core/types';
import { BaseDomainStore } from './base-domain-store';

export interface InboxStoreState {
  notifications: InboxNotification[];
  activity: ActivityEvent[];
  loading: boolean;
  error: string | null;
}

const emptyState = (): InboxStoreState => ({
  notifications: [],
  activity: [],
  loading: false,
  error: null,
});

class InboxStore extends BaseDomainStore<InboxStoreState> {
  private static instance: InboxStore;
  private state: InboxStoreState = emptyState();

  private constructor() {
    super();
  }

  static getInstance(): InboxStore {
    if (!InboxStore.instance) {
      InboxStore.instance = new InboxStore();
    }
    return InboxStore.instance;
  }

  protected getSnapshot(): InboxStoreState {
    return {
      notifications: [...this.state.notifications],
      activity: [...this.state.activity],
      loading: this.state.loading,
      error: this.state.error,
    };
  }

  hydrate(notifications: InboxNotification[], activity: ActivityEvent[]): void {
    this.state = {
      ...this.state,
      notifications,
      activity,
      loading: false,
      error: null,
    };
    this.notify();
  }

  markNotificationRead(notificationId: string): void {
    this.state = {
      ...this.state,
      notifications: this.state.notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
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

  reset(): void {
    this.state = emptyState();
    this.notify();
  }
}

export const inboxStore = InboxStore.getInstance();
