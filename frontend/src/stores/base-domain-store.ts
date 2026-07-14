/**
 * Base domain store — client-tier event-driven pattern.
 * Reference: landi-store-extension `CartStateManager` (subscribe → hydrate → unsubscribe).
 */

export type DomainStoreListener = () => void;

export abstract class BaseDomainStore<TState> {
  private listeners = new Set<DomainStoreListener>();
  /** Cached snapshot for useSyncExternalStore getServerSnapshot (must be referentially stable). */
  private serverSnapshotCache: TState | null = null;

  protected abstract getSnapshot(): TState;

  protected invalidateServerSnapshotCache(): void {
    this.serverSnapshotCache = null;
  }

  protected notify(): void {
    this.invalidateServerSnapshotCache();
    for (const listener of this.listeners) {
      listener();
    }
  }

  /**
   * Move subscribers from an orphaned duplicate instance onto this canonical store.
   * OpenNext/webpack chunk splits can leave React hooks subscribed to a non-global
   * instance while mutations pin a different one on `globalThis`.
   */
  protected adoptListenersFrom(other: BaseDomainStore<TState>): void {
    if (other === this) {
      return;
    }
    for (const listener of other.listeners) {
      this.listeners.add(listener);
    }
    other.listeners.clear();
    other.invalidateServerSnapshotCache();
  }

  /** Subscribe for useSyncExternalStore — notify-only after mutations.
   * Call the listener once after subscribe so late subscribers pick up current state
   * without violating the "no sync notify during subscribe" tear guidance: schedule microtask.
   */
  subscribe(listener: DomainStoreListener): () => void {
    this.listeners.add(listener);
    queueMicrotask(() => {
      if (this.listeners.has(listener)) {
        listener();
      }
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** For useSyncExternalStore — returns a stable reference until the store notifies. */
  getServerSnapshot(): TState {
    if (this.serverSnapshotCache === null) {
      this.serverSnapshotCache = this.getSnapshot();
    }
    return this.serverSnapshotCache;
  }
}
