'use client';

import * as React from 'react';
import { buildWorkspaceLobbyRoomId } from '@landi-flow/collaboration';
import { useOthers } from '@liveblocks/react/suspense';
import { isLiveblocksConfigured } from '@/lib/liveblocks/config';
import { isMockAuthEnabled } from '@/lib/api/config';
import { isWorkspaceUuid } from '@/lib/workspace/is-workspace-uuid';
import { CollaborativeRoom, useLiveblocksActive } from './collaboration-provider';
import { PresenceAvatars } from './presence-cursors';

export interface WorkspacePresenceLobbyProps {
  workspaceId: string;
}

/**
 * Presence-only workspace lobby.
 * Hidden when Liveblocks is unavailable, mock auth, inactive provider, or non-UUID workspace.
 * Alone in the room → muted “Just you” (no green “1 online” that conflicts with offline agents).
 */
export function WorkspacePresenceLobby({
  workspaceId,
}: WorkspacePresenceLobbyProps): React.ReactElement | null {
  const liveblocksActive = useLiveblocksActive();

  if (
    !isLiveblocksConfigured() ||
    isMockAuthEnabled() ||
    !liveblocksActive ||
    !isWorkspaceUuid(workspaceId)
  ) {
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
  const peerCount = others.length;
  const hasPeers = peerCount > 0;
  const onlineCount = peerCount + 1;

  return (
    <div
      className="flex items-center gap-2"
      title={hasPeers ? `${onlineCount} online in workspace` : 'Only you in this workspace'}
      data-testid="workspace-presence-lobby"
      data-presence-peers={hasPeers ? 'true' : 'false'}
    >
      {hasPeers ? (
        <>
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <PresenceAvatars maxVisible={3} />
          <span className="text-xs text-muted-foreground" data-testid="workspace-presence-count">
            {onlineCount} online
          </span>
        </>
      ) : (
        <span className="text-xs text-muted-foreground" data-testid="workspace-presence-solo">
          Just you
        </span>
      )}
    </div>
  );
}
