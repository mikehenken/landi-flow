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

  /** Subscribe with immediate hydration; returns unsubscribe closure. */
  subscribe(listener: DomainStoreListener): () => void {
    const wrappedListener = (): void => {
      listener();
    };
    this.listeners.add(wrappedListener);
    listener();
    return () => {
      this.listeners.delete(wrappedListener);
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
