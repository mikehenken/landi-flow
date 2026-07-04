/**
 * Base domain store — client-tier event-driven pattern.
 * Reference: landi-store-extension `CartStateManager` (subscribe → hydrate → unsubscribe).
 */

export type DomainStoreListener<TState> = (state: TState) => void;

export abstract class BaseDomainStore<TState> {
  private listeners = new Set<DomainStoreListener<TState>>();

  protected abstract getSnapshot(): TState;

  protected notify(): void {
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

  /** For useSyncExternalStore(serverSnapshot must match getSnapshot shape). */
  getServerSnapshot(): TState {
    return this.getSnapshot();
  }
}
