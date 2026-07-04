'use client';

import * as React from 'react';
import '@/liveblocks.config';
import {
  LiveblocksProvider as BaseLiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from '@liveblocks/react/suspense';
import { createCorrelationContext } from '@/lib/correlation';
import { isLiveblocksConfigured } from '@/lib/liveblocks/config';
import type { JsonObject } from '@liveblocks/client';

export interface CollaborationProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
}

async function authEndpoint(room?: string): Promise<{ token: string }> {
  const { correlation_id } = createCorrelationContext();
  const response = await fetch('/api/liveblocks-auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Landi-Correlation-Id': correlation_id,
    },
    body: JSON.stringify({ room }),
  });
  return response.json() as Promise<{ token: string }>;
}

export function CollaborationProvider({
  children,
  enabled = true,
}: CollaborationProviderProps): React.ReactElement {
  if (!enabled || !isLiveblocksConfigured()) {
    return <>{children}</>;
  }

  return (
    <BaseLiveblocksProvider authEndpoint={authEndpoint}>
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
  if (!isLiveblocksConfigured()) {
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
