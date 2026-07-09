'use client';

import * as React from 'react';
import '@/liveblocks.config';
import {
  LiveblocksProvider as BaseLiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from '@liveblocks/react/suspense';
import { fetchLiveblocksAuthToken } from '@/lib/liveblocks/auth-endpoint';
import { isLiveblocksConfigured } from '@/lib/liveblocks/config';
import { isMockAuthEnabled } from '@/lib/api/config';
import { useSupabaseSession } from '@/lib/supabase/session-provider';
import type { JsonObject } from '@liveblocks/client';

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
    return <>{children}</>;
  }

  // Defer Liveblocks auth until Supabase cookies are hydrated on the client.
  if (!isMockAuthEnabled() && (!sessionReady || !user)) {
    return <>{children}</>;
  }

  return (
    <BaseLiveblocksProvider authEndpoint={fetchLiveblocksAuthToken}>
      {children}
    </BaseLiveblocksProvider>
  );
}

export interface CollaborativeRoomProps {
  roomId: string;
  initialPresence?: Partial<import('@landi-flow/collaboration').CollabPresence>;
  initialStorage?: JsonObject;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function CollaborativeRoom({
  roomId,
  initialPresence,
  initialStorage,
  children,
  fallback,
}: CollaborativeRoomProps): React.ReactElement {
  if (!isLiveblocksConfigured() || isMockAuthEnabled()) {
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
