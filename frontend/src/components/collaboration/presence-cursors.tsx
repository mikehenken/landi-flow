'use client';

import * as React from 'react';
import { useOthers, useUpdateMyPresence } from '@liveblocks/react/suspense';
import { Avatar, AvatarFallback, cn } from '@landi-flow/ui';
import type { CollabUserMeta } from '@landi-flow/collaboration';

export interface PresenceAvatarsProps {
  maxVisible?: number;
  className?: string;
}

export function PresenceAvatars({
  maxVisible = 5,
  className,
}: PresenceAvatarsProps): React.ReactElement {
  const others = useOthers();

  const peers = others
    .map((other) => other.info as CollabUserMeta | undefined)
    .filter((info): info is CollabUserMeta => Boolean(info?.id));

  const visible = peers.slice(0, maxVisible);
  const overflow = peers.length - visible.length;

  if (peers.length === 0) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        Only you
      </span>
    );
  }

  return (
    <div className={cn('flex items-center -space-x-2', className)} aria-label="Active collaborators">
      {visible.map((peer) => (
        <Avatar
          key={peer.id}
          actorType={peer.actorType === 'agent' ? 'agent' : 'human'}
          size="sm"
          active={peer.actorType === 'agent'}
          title={peer.actorType === 'agent' ? `${peer.name} (AI Agent)` : peer.name}
        >
          <AvatarFallback actorType={peer.actorType === 'agent' ? 'agent' : 'human'}>
            {peer.actorType === 'agent' ? 'AI' : peer.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 ? (
        <span className="ml-2 text-xs text-muted-foreground">+{overflow}</span>
      ) : null}
    </div>
  );
}

export interface CursorOverlayProps {
  containerRef: React.RefObject<HTMLElement | null>;
}

export function CursorOverlay({ containerRef }: CursorOverlayProps): React.ReactElement | null {
  const others = useOthers();
  const updatePresence = useUpdateMyPresence();

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent): void => {
      const rect = container.getBoundingClientRect();
      updatePresence({
        cursorX: event.clientX - rect.left,
        cursorY: event.clientY - rect.top,
      });
    };

    const handlePointerLeave = (): void => {
      updatePresence({ cursorX: null, cursorY: null });
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [containerRef, updatePresence]);

  return (
    <>
      {others.map(({ connectionId, presence, info }) => {
        if (presence.cursorX == null || presence.cursorY == null) {
          return null;
        }

        const meta = info as CollabUserMeta | undefined;
        const isAgent = meta?.actorType === 'agent';
        const label = meta?.name ?? 'Collaborator';

        return (
          <div
            key={connectionId}
            className="pointer-events-none absolute z-50 transition-transform duration-75"
            style={{ left: Number(presence.cursorX), top: Number(presence.cursorY) }}
          >
            <svg
              width="16"
              height="20"
              viewBox="0 0 16 20"
              fill="none"
              className={cn(isAgent ? 'text-violet-400' : 'text-primary')}
            >
              <path
                d="M0 0L0 16L4 12L7 19L9 18L6 11L12 11L0 0Z"
                fill="currentColor"
              />
            </svg>
            <span
              className={cn(
                'ml-3 -mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-white',
                isAgent ? 'bg-violet-600' : 'bg-primary'
              )}
            >
              {isAgent ? `${label} · AI` : label}
            </span>
          </div>
        );
      })}
    </>
  );
}
