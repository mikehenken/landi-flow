'use client';

import * as React from 'react';
import type { ActorType } from '@landi-flow/core/types';
import { cn } from '@landi-flow/ui';
import { Bot, User, Server } from 'lucide-react';

export interface CommentAttributionBadgeProps {
  actorType: ActorType;
  authorLabel: string;
  onBehalfOfLabel?: string | null;
  className?: string;
}

/** MCP-IDE-002 — human / agent / system comment attribution badge. */
export function CommentAttributionBadge({
  actorType,
  authorLabel,
  onBehalfOfLabel,
  className,
}: CommentAttributionBadgeProps): React.ReactElement {
  const Icon =
    actorType === 'agent' ? Bot : actorType === 'system' ? Server : User;

  const badgeLabel =
    actorType === 'agent' && onBehalfOfLabel
      ? `${authorLabel} on behalf of ${onBehalfOfLabel}`
      : authorLabel;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        actorType === 'agent' && 'bg-primary/15 text-primary ring-1 ring-primary/30',
        actorType === 'human' && 'bg-white/10 text-muted-foreground',
        actorType === 'system' && 'bg-amber-500/10 text-amber-200',
        className,
      )}
      data-testid={`comment-attribution-${actorType}`}
      data-actor-type={actorType}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {actorType === 'agent' ? <span>AI Agent</span> : null}
      <span>{badgeLabel}</span>
    </span>
  );
}
