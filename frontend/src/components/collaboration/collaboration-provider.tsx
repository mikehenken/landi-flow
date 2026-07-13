'use client';

import * as React from 'react';
import '@/liveblocks.config';
import {
  LiveblocksProvider as BaseLiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from '@liveblocks/react/suspense';
import { fetchLiveblocksAuthToken } from '@/lib/liveblocks/auth-endpoint';
import { getLiveblocksClient } from '@/lib/liveblocks/client';
import { isLiveblocksConfigured } from '@/lib/liveblocks/config';
import { isMockAuthEnabled } from '@/lib/api/config';
import { useSupabaseSession } from '@/lib/supabase/session-provider';
import { assertLiveblocksRoomWorkspaceUuid } from '@/lib/workspace/liveblocks-room-workspace';
import type { JsonObject } from '@liveblocks/client';

/** True only when `LiveblocksProvider` is mounted (session ready + keys configured). */
const LiveblocksActiveContext = React.createContext(false);

export function useLiveblocksActive(): boolean {
  return React.useContext(LiveblocksActiveContext);
}

function CollaborationInactiveShell({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <LiveblocksActiveContext.Provider value={false}>
      {children}
    </LiveblocksActiveContext.Provider>
  );
}

export interface CollaborationProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export function CollaborationProvider({
  children,
  enabled = true,
}: CollaborationProviderProps): React.ReactElement {
  const { user, isReady: sessionReady } = useSupabaseSession();

  if (!enabled || !isLiveblocksConfigured() || isMockAuthEnabled()) {
    return <CollaborationInactiveShell>{children}</CollaborationInactiveShell>;
  }

  // Defer Liveblocks auth until Supabase cookies are hydrated on the client.
  if (!isMockAuthEnabled() && (!sessionReady || !user)) {
    return <CollaborationInactiveShell>{children}</CollaborationInactiveShell>;
  }

  const liveblocksClient = getLiveblocksClient();

  return (
    <LiveblocksActiveContext.Provider value={true}>
      {liveblocksClient ? (
        <BaseLiveblocksProvider client={liveblocksClient}>{children}</BaseLiveblocksProvider>
      ) : (
        <BaseLiveblocksProvider authEndpoint={fetchLiveblocksAuthToken}>
          {children}
        </BaseLiveblocksProvider>
      )}
    </LiveblocksActiveContext.Provider>
  );
}

export interface CollaborativeRoomProps {
  roomId: string;
  initialPresence?: Partial<import('@landi-flow/collaboration').CollabPresence>;
  initialStorage?: JsonObject;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function roomHasResolvedWorkspaceUuid(roomId: string): boolean {
  return assertLiveblocksRoomWorkspaceUuid(roomId).ok;
}

export function CollaborativeRoom({
  roomId,
  initialPresence,
  initialStorage,
  children,
  fallback,
}: CollaborativeRoomProps): React.ReactElement {
  const liveblocksActive = useLiveblocksActive();

  if (
    !isLiveblocksConfigured() ||
    isMockAuthEnabled() ||
    !liveblocksActive ||
    !roomHasResolvedWorkspaceUuid(roomId)
  ) {
    return <>{children}</>;
  }

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursorX: null,
        cursorY: null,
        selectionFieldId: null,
        selectionCardId: null,
        editingSurface: null,
        editingTarget: null,
        ...initialPresence,
      }}
      initialStorage={initialStorage}
    >
      <ClientSideSuspense fallback={fallback ?? <RoomLoadingFallback />}>
        {children}
      </ClientSideSuspense>
    </RoomProvider>
  );
}

function RoomLoadingFallback(): React.ReactElement {
  return (
    <div className="flex items-center justify-center p-4 text-xs text-muted-foreground">
      Connecting to collaboration room…
    </div>
  );
}

export { RoomProvider, ClientSideSuspense };
