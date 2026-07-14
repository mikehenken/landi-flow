'use client';

import * as React from 'react';
import type { Epic, Story } from '@landi-flow/core/types';
import { isMockAuthEnabled } from '@/lib/api/config';
import { useSupabaseSession } from '@/lib/supabase/session-provider';
import {
  applyBootstrapRuntimeContext,
  loadWorkspaceBootstrap,
  type WorkspaceBootstrapPayload,
} from '@/lib/api/workspace-bootstrap';
import { loadWorkspaceRuntimeContext } from '@/lib/api/workspace-context';
import { loadCustomers } from '@/controllers/customer-controller';
import { loadEpics } from '@/controllers/epic-controller';
import { loadWorkspaceMembers } from '@/controllers/member-controller';
import { loadStories } from '@/controllers/story-controller';
import { isAuthFailure, recoverSessionAndRedirect } from '@/lib/auth/recover-session';
import { isWorkspaceUuid, useWorkspace } from '@/lib/workspace';
import { usePathname } from '@/i18n/navigation';
import { SEED_CUSTOMERS, SEED_EPICS, SEED_STORIES } from '@/lib/seed-data';
import { applyMockCustomerAdditions } from '@/lib/customer-mock-persistence';
import { applyMockEpicAdditions } from '@/lib/epic-mock-persistence';
import { applyMockStoryPatches } from '@/lib/story-mock-persistence';
import { customerStore } from '@/stores/customer-store';
import { epicStore } from '@/stores/epic-store';
import { memberStore } from '@/stores/member-store';
import { storyStore } from '@/stores/story-store';
import { WorkspaceContentSkeleton } from '@/components/workspace-content-skeleton';
import { ApiRequestError } from '@/lib/api/client';

type StoreHydrationGlobal = typeof globalThis & {
  __landiFlowStoresHydrated?: boolean;
  __landiFlowHydratedWorkspaceId?: string | null;
  __landiFlowHydrationPromise?: Promise<void> | null;
  /** Workspace id the current in-flight hydrate promise targets (may differ from hydrated). */
  __landiFlowHydrationInflightWorkspaceId?: string | null;
  /** Bumped on soft-switch / reset so stale in-flight completions cannot apply. */
  __landiFlowHydrationGeneration?: number;
};

function hydrationGlobal(): StoreHydrationGlobal {
  return globalThis as StoreHydrationGlobal;
}

function getStoresHydrated(): boolean {
  return hydrationGlobal().__landiFlowStoresHydrated === true;
}

function setStoresHydrated(value: boolean): void {
  hydrationGlobal().__landiFlowStoresHydrated = value;
}

function getHydratedWorkspaceId(): string | null {
  return hydrationGlobal().__landiFlowHydratedWorkspaceId ?? null;
}

function setHydratedWorkspaceId(value: string | null): void {
  hydrationGlobal().__landiFlowHydratedWorkspaceId = value;
}

function getHydrationPromise(): Promise<void> | null {
  return hydrationGlobal().__landiFlowHydrationPromise ?? null;
}

function setHydrationPromise(value: Promise<void> | null): void {
  hydrationGlobal().__landiFlowHydrationPromise = value;
}

function getInflightWorkspaceId(): string | null {
  return hydrationGlobal().__landiFlowHydrationInflightWorkspaceId ?? null;
}

function setInflightWorkspaceId(value: string | null): void {
  hydrationGlobal().__landiFlowHydrationInflightWorkspaceId = value;
}

function getHydrationGeneration(): number {
  return hydrationGlobal().__landiFlowHydrationGeneration ?? 0;
}

function bumpHydrationGeneration(): number {
  const next = getHydrationGeneration() + 1;
  hydrationGlobal().__landiFlowHydrationGeneration = next;
  return next;
}

function clearHydrationFlags(): void {
  setHydrationPromise(null);
  setInflightWorkspaceId(null);
  setStoresHydrated(false);
  setHydratedWorkspaceId(null);
  if (typeof document !== 'undefined') {
    document.documentElement.removeAttribute('data-app-hydrated');
  }
}

function resetHydrationForWorkspaceChange(nextWorkspaceId: string): void {
  if (getHydratedWorkspaceId() !== null && getHydratedWorkspaceId() !== nextWorkspaceId) {
    bumpHydrationGeneration();
    clearHydrationFlags();
  }
}

/**
 * Full reset for soft workspace switches (no full page reload).
 * Clears hydration flags so StoreHydrator re-runs for the next workspace.
 * Bumps generation so any in-flight bootstrap from the previous workspace
 * cannot mark hydrated / overwrite stores after the switch.
 */
export function resetStoreHydrationState(): void {
  bumpHydrationGeneration();
  clearHydrationFlags();
}

/**
 * Skip refetch only when this workspace was marked hydrated.
 * Story emptiness alone must not leave the shell on a permanent skeleton —
 * empty workspaces and post-hydrate remounts still need to render children.
 * Orphaned chunk instances are healed via STORY_STORE_CHANGE_EVENT + pin adopt.
 */
function isStoryStoreHydratedForWorkspace(workspaceId: string): boolean {
  return getStoresHydrated() && getHydratedWorkspaceId() === workspaceId;
}

type PriorityHydrateResult =
  | { kind: 'bootstrap'; payload: WorkspaceBootstrapPayload }
  | { kind: 'legacy'; epics: Epic[]; stories: Story[] };

/**
 * Fetch priority domain data without mutating stores.
 * Caller applies only when the soft-switch generation is still current.
 */
async function fetchPriorityHydrateData(
  workspaceId: string,
): Promise<PriorityHydrateResult> {
  try {
    // Full aggregate = one client hop for context + domain lists (PERF-03).
    const bootstrap = await loadWorkspaceBootstrap(workspaceId, { phase: 'full' });
    return { kind: 'bootstrap', payload: bootstrap };
  } catch (error) {
    // Auth must still surface so StoreHydrator can recover/redirect.
    if (
      error instanceof ApiRequestError &&
      (error.status === 401 || error.status === 403)
    ) {
      throw error;
    }
    // Aggregate unavailable or partial outage — keep shell hydrate working via legacy hops.
    await loadWorkspaceRuntimeContext(workspaceId);
    const [epics, stories] = await Promise.all([
      loadEpics(workspaceId),
      loadStories(workspaceId),
    ]);
    return { kind: 'legacy', epics, stories };
  }
}

function applyPriorityHydrateData(result: PriorityHydrateResult): WorkspaceBootstrapPayload | null {
  if (result.kind === 'bootstrap') {
    applyBootstrapRuntimeContext(result.payload);
    epicStore.hydrate(result.payload.epics);
    storyStore.hydrate(result.payload.stories);
    return result.payload;
  }
  epicStore.hydrate(result.epics);
  storyStore.hydrate(result.stories);
  return null;
}

function hydrateDeferredFromBootstrap(payload: WorkspaceBootstrapPayload): boolean {
  if (payload.customers === null || payload.members === null) {
    return false;
  }
  customerStore.hydrate(payload.customers);
  memberStore.hydrate(payload.members);
  return true;
}

async function hydrateDeferredFromApi(workspaceId: string): Promise<void> {
  customerStore.setLoading(true);
  memberStore.setLoading(true);

  try {
    const [customers, members] = await Promise.all([
      loadCustomers(workspaceId),
      loadWorkspaceMembers(workspaceId),
    ]);
    customerStore.hydrate(customers);
    memberStore.hydrate(members);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to hydrate deferred workspace data';
    customerStore.setError(message);
    memberStore.setError(message);
  }
}

function hydrateFromSeed(): void {
  epicStore.hydrate(applyMockEpicAdditions(SEED_EPICS));
  storyStore.hydrate(applyMockStoryPatches(SEED_STORIES));
  customerStore.hydrate(applyMockCustomerAdditions(SEED_CUSTOMERS));

  const existingMembers = memberStore.getServerSnapshot().members;
  if (existingMembers.length === 0) {
    memberStore.hydrate([]);
  }
}

function markAppHydrated(workspaceId: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-app-hydrated', 'true');
  }
  setStoresHydrated(true);
  setHydratedWorkspaceId(workspaceId);
}

/** Hydrates domain stores from API (production) or seed data (MOCK_AUTH). */
export function StoreHydrator({ children }: { children: React.ReactNode }): React.ReactElement {
  const { workspace } = useWorkspace();
  const pathname = usePathname();
  const { isReady: sessionReady } = useSupabaseSession();

  const [ready, setReady] = React.useState(() => isStoryStoreHydratedForWorkspace(workspace.id));
  const [hydrationError, setHydrationError] = React.useState<string | null>(null);
  const [redirectingToLogin, setRedirectingToLogin] = React.useState(false);
  const redirectStartedRef = React.useRef(false);

  const redirectToLogin = React.useCallback((): void => {
    if (redirectStartedRef.current || typeof window === 'undefined') {
      return;
    }
    redirectStartedRef.current = true;
    setRedirectingToLogin(true);
    setHydrationError(null);
    void recoverSessionAndRedirect(pathname);
  }, [pathname]);

  React.useEffect(() => {
    if (ready && isStoryStoreHydratedForWorkspace(workspace.id)) {
      markAppHydrated(workspace.id);
    }
  }, [ready, workspace.id]);

  React.useLayoutEffect(() => {
    resetHydrationForWorkspaceChange(workspace.id);

    if (isStoryStoreHydratedForWorkspace(workspace.id)) {
      markAppHydrated(workspace.id);
      setReady(true);
      return;
    }

    if (isMockAuthEnabled()) {
      if (!getStoresHydrated() || getHydratedWorkspaceId() !== workspace.id) {
        hydrateFromSeed();
      }
      markAppHydrated(workspace.id);
      setReady(true);
      return;
    }

    if (!sessionReady) {
      return;
    }

    // Demo/host ids cannot hit uuid-typed APIs — wait for ActiveWorkspaceProvider.
    // Do not mark ready; shell skeleton stays until a real workspace UUID arrives.
    if (!isWorkspaceUuid(workspace.id)) {
      return;
    }

    const existingPromise = getHydrationPromise();
    const inflightForThisWorkspace =
      existingPromise !== null && getInflightWorkspaceId() === workspace.id;
    const settledForThisWorkspace =
      existingPromise !== null && getHydratedWorkspaceId() === workspace.id;

    if (inflightForThisWorkspace || settledForThisWorkspace) {
      void existingPromise.finally(() => {
        if (getHydratedWorkspaceId() === workspace.id || getStoresHydrated()) {
          setReady(true);
        }
      });
      return;
    }

    // Stale promise for a different workspace — drop it (generation already bumped on soft switch).
    if (existingPromise && getInflightWorkspaceId() !== workspace.id) {
      bumpHydrationGeneration();
      setHydrationPromise(null);
      setInflightWorkspaceId(null);
    }

    const generationAtStart = getHydrationGeneration();
    const targetWorkspaceId = workspace.id;

    const hasExistingData =
      storyStore.getServerSnapshot().stories.length > 0 ||
      epicStore.getServerSnapshot().epics.length > 0;
    if (!hasExistingData) {
      epicStore.setLoading(true);
      storyStore.setLoading(true);
    }

    const promise = (async () => {
      try {
        const fetched = await fetchPriorityHydrateData(targetWorkspaceId);

        // Soft switch / reset happened while we were in flight — discard before apply.
        if (getHydrationGeneration() !== generationAtStart) {
          return;
        }

        const bootstrap = applyPriorityHydrateData(fetched);
        markAppHydrated(targetWorkspaceId);
        setHydrationError(null);
        setReady(true);
        // Deferred customers/members: prefer same aggregate payload, else background GETs.
        if (!bootstrap || !hydrateDeferredFromBootstrap(bootstrap)) {
          void hydrateDeferredFromApi(targetWorkspaceId);
        }
      } catch (error) {
        if (getHydrationGeneration() !== generationAtStart) {
          return;
        }

        setHydrationPromise(null);
        setInflightWorkspaceId(null);
        setHydratedWorkspaceId(null);
        setStoresHydrated(false);

        if (isAuthFailure(error)) {
          redirectToLogin();
          return;
        }

        const message =
          error instanceof Error ? error.message : 'Failed to hydrate stores from API';
        epicStore.setError(message);
        storyStore.setError(message);
        setHydrationError(message);
      }
    })();

    setInflightWorkspaceId(targetWorkspaceId);
    setHydrationPromise(promise);

    void promise.finally(() => {
      if (getHydrationGeneration() !== generationAtStart) {
        return;
      }
      if (getInflightWorkspaceId() === targetWorkspaceId) {
        setInflightWorkspaceId(null);
      }
      setReady(true);
    });
  }, [workspace.id, sessionReady, redirectToLogin]);

  if (redirectingToLogin) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-muted-foreground">
        Redirecting to sign in.
      </div>
    );
  }

  if (!ready) {
    const mockAlreadyHydrated =
      isMockAuthEnabled() &&
      typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-app-hydrated') === 'true';

    if (isStoryStoreHydratedForWorkspace(workspace.id)) {
      return <>{children}</>;
    }
    if (mockAlreadyHydrated) {
      return <>{children}</>;
    }
    return <WorkspaceContentSkeleton />;
  }

  if (hydrationError) {
    return (
      <div
        className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 px-6 text-center"
        role="alert"
      >
        <p className="text-sm font-medium text-destructive">Failed to load workspace data</p>
        <p className="max-w-md text-sm text-muted-foreground">{hydrationError}</p>
      </div>
    );
  }

  return <>{children}</>;
}
