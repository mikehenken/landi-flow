'use client';

import * as React from 'react';
import { buildWorkspaceLobbyRoomId } from '@landi-flow/collaboration';
import { useOthers } from '@liveblocks/react/suspense';
import { isLiveblocksConfigured } from '@/lib/liveblocks/config';
import { isMockAuthEnabled } from '@/lib/api/config';
import { CollaborativeRoom, useLiveblocksActive } from './collaboration-provider';
import { PresenceAvatars } from './presence-cursors';

export interface WorkspacePresenceLobbyProps {
  workspaceId: string;
}

/** Presence-only workspace lobby — no Storage, ephemeral toasts via broadcastEvent. */
export function WorkspacePresenceLobby({
  workspaceId,
}: WorkspacePresenceLobbyProps): React.ReactElement | null {
  const liveblocksActive = useLiveblocksActive();

  if (!isLiveblocksConfigured() || isMockAuthEnabled() || !liveblocksActive) {
    return null;
  }

  const roomId = buildWorkspaceLobbyRoomId(workspaceId);

  return (
    <CollaborativeRoom roomId={roomId}>
      <LobbyInner />
    </CollaborativeRoom>
  );
}

function LobbyInner(): React.ReactElement {
  const others = useOthers();
  const onlineCount = others.length + 1;

  return (
    <div className="flex items-center gap-2" title={`${onlineCount} online in workspace`}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <PresenceAvatars maxVisible={3} />
      <span className="text-xs text-muted-foreground">{onlineCount} online</span>
    </div>
  );
}
