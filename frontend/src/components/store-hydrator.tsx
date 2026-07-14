'use client';

import * as React from 'react';
import { isMockAuthEnabled } from '@/lib/api/config';
import { useSupabaseSession } from '@/lib/supabase/session-provider';
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

type StoreHydrationGlobal = typeof globalThis & {
  __landiFlowStoresHydrated?: boolean;
  __landiFlowHydratedWorkspaceId?: string | null;
  __landiFlowHydrationPromise?: Promise<void> | null;
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

function resetHydrationForWorkspaceChange(nextWorkspaceId: string): void {
  if (getHydratedWorkspaceId() !== null && getHydratedWorkspaceId() !== nextWorkspaceId) {
    setHydrationPromise(null);
    setStoresHydrated(false);
    setHydratedWorkspaceId(null);
    if (typeof document !== 'undefined') {
      document.documentElement.removeAttribute('data-app-hydrated');
    }
  }
}

/**
 * Skip refetch only when the shared singleton actually holds stories.
 * Prevents "hydrated" flags on one chunk from masking an empty global store.
 */
function isStoryStoreHydratedForWorkspace(workspaceId: string): boolean {
  if (isMockAuthEnabled()) {
    return getStoresHydrated() && getHydratedWorkspaceId() === workspaceId;
  }
  return (
    getStoresHydrated() &&
    getHydratedWorkspaceId() === workspaceId &&
    storyStore.getServerSnapshot().stories.length > 0
  );
}

async function hydrateFromApi(workspaceId: string): Promise<void> {
  const hasExistingData =
    storyStore.getServerSnapshot().stories.length > 0 ||
    epicStore.getServerSnapshot().epics.length > 0;

  if (!hasExistingData) {
    epicStore.setLoading(true);
    storyStore.setLoading(true);
    customerStore.setLoading(true);
    memberStore.setLoading(true);
  }

  try {
    await loadWorkspaceRuntimeContext(workspaceId);

    const [epics, stories, customers, members] = await Promise.all([
      loadEpics(workspaceId),
      loadStories(workspaceId),
      loadCustomers(workspaceId),
      loadWorkspaceMembers(workspaceId),
    ]);

    epicStore.hydrate(epics);
    storyStore.hydrate(stories);
    customerStore.hydrate(customers);
    memberStore.hydrate(members);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to hydrate stores from API';
    epicStore.setError(message);
    storyStore.setError(message);
    customerStore.setError(message);
    memberStore.setError(message);
    throw error;
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

    if (!isWorkspaceUuid(workspace.id)) {
      return;
    }

    const existingPromise = getHydrationPromise();
    if (existingPromise && getHydratedWorkspaceId() === workspace.id) {
      void existingPromise.finally(() => {
        setReady(true);
      });
      return;
    }

    const promise = (async () => {
      try {
        await hydrateFromApi(workspace.id);
        markAppHydrated(workspace.id);
        setHydrationError(null);
      } catch (error) {
        setHydrationPromise(null);
        setHydratedWorkspaceId(null);
        setStoresHydrated(false);

        if (isAuthFailure(error)) {
          redirectToLogin();
          return;
        }

        const message =
          error instanceof Error ? error.message : 'Failed to hydrate stores from API';
        setHydrationError(message);
      }
    })();

    setHydrationPromise(promise);

    void promise.finally(() => {
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
