'use client';



import * as React from 'react';

import { isMockAuthEnabled } from '@/lib/api/config';

import { useSupabaseSession } from '@/lib/supabase/session-provider';

import { loadWorkspaceRuntimeContext } from '@/lib/api/workspace-context';

import { loadCustomers } from '@/controllers/customer-controller';

import { loadEpics } from '@/controllers/epic-controller';

import { loadWorkspaceMembers } from '@/controllers/member-controller';

import { loadStories } from '@/controllers/story-controller';

import { isWorkspaceUuid, useWorkspace } from '@/lib/workspace';

import { SEED_CUSTOMERS, SEED_EPICS, SEED_STORIES } from '@/lib/seed-data';
import { applyMockCustomerAdditions } from '@/lib/customer-mock-persistence';
import { applyMockEpicAdditions } from '@/lib/epic-mock-persistence';
import { applyMockStoryPatches } from '@/lib/story-mock-persistence';

import { customerStore } from '@/stores/customer-store';

import { epicStore } from '@/stores/epic-store';

import { memberStore } from '@/stores/member-store';

import { storyStore } from '@/stores/story-store';

import { WorkspaceContentSkeleton } from '@/components/workspace-content-skeleton';



let storesHydrated = false;

let hydratedWorkspaceId: string | null = null;

let hydrationPromise: Promise<void> | null = null;



function resetHydrationForWorkspaceChange(nextWorkspaceId: string): void {

  if (hydratedWorkspaceId !== null && hydratedWorkspaceId !== nextWorkspaceId) {

    hydrationPromise = null;

    storesHydrated = false;

    hydratedWorkspaceId = null;

    if (typeof document !== 'undefined') {

      document.documentElement.removeAttribute('data-app-hydrated');

    }

  }

}



async function hydrateFromApi(workspaceId: string): Promise<void> {

  epicStore.setLoading(true);

  storyStore.setLoading(true);

  customerStore.setLoading(true);

  memberStore.setLoading(true);



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

  memberStore.hydrate([]);

}



function markAppHydrated(workspaceId: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-app-hydrated', 'true');
  }
  storesHydrated = true;
  hydratedWorkspaceId = workspaceId;
}



/** Hydrates domain stores from API (production) or seed data (MOCK_AUTH). */

export function StoreHydrator({ children }: { children: React.ReactNode }): React.ReactElement {

  const { workspace } = useWorkspace();

  const { user, isReady: sessionReady } = useSupabaseSession();
  const userId = user?.id ?? null;

  const [ready, setReady] = React.useState(
    () => storesHydrated && hydratedWorkspaceId === workspace.id,
  );

  const [hydrationError, setHydrationError] = React.useState<string | null>(null);



  React.useEffect(() => {
    if (ready && storesHydrated && hydratedWorkspaceId === workspace.id) {
      markAppHydrated(workspace.id);
    }
  }, [ready, workspace.id]);

  React.useLayoutEffect(() => {

    resetHydrationForWorkspaceChange(workspace.id);



    if (storesHydrated && hydratedWorkspaceId === workspace.id) {
      markAppHydrated(workspace.id);
      setReady(true);
      return;
    }

    if (isMockAuthEnabled()) {
      if (!storesHydrated || hydratedWorkspaceId !== workspace.id) {
        hydrateFromSeed();
      }
      markAppHydrated(workspace.id);
      setReady(true);
      return;
    }



    if (!sessionReady) {

      return;

    }



    if (!userId) {

      setHydrationError('Authentication required');

      setReady(true);

      return;

    }



    if (!isWorkspaceUuid(workspace.id)) {

      return;

    }



    if (hydrationPromise && hydratedWorkspaceId === workspace.id) {

      void hydrationPromise.finally(() => {

        setReady(true);

      });

      return;

    }



    hydrationPromise = (async () => {

      try {

        await hydrateFromApi(workspace.id);

        markAppHydrated(workspace.id);

        setHydrationError(null);

      } catch (error) {

        hydrationPromise = null;

        hydratedWorkspaceId = null;

        const message =

          error instanceof Error ? error.message : 'Failed to hydrate stores from API';

        setHydrationError(message);

      }

    })();



    void hydrationPromise.finally(() => {

      setReady(true);

    });

  }, [workspace.id, sessionReady, userId]);



  if (!ready) {
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


