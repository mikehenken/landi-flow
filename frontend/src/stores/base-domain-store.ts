/**
 * Base domain store — client-tier event-driven pattern.
 * Reference: landi-store-extension `CartStateManager` (subscribe → hydrate → unsubscribe).
 */

export type DomainStoreListener<TState> = (state: TState) => void;

export abstract class BaseDomainStore<TState> {
  private listeners = new Set<DomainStoreListener<TState>>();
  /** Cached snapshot for useSyncExternalStore getServerSnapshot (must be referentially stable). */
  private serverSnapshotCache: TState | null = null;

  protected abstract getSnapshot(): TState;

  protected invalidateServerSnapshotCache(): void {
    this.serverSnapshotCache = null;
  }

  protected notify(): void {
    this.invalidateServerSnapshotCache();
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  /** Subscribe with immediate hydration; returns unsubscribe closure. */
  subscribe(listener: DomainStoreListener<TState>): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
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
