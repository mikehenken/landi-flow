'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { MessageAuthor, MessageRole } from './types';

export interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  role: MessageRole;
  author?: MessageAuthor;
  children: React.ReactNode;
}

/**
 * Role-aligned conversation row. Assistant/agent messages render on the left
 * with a squircle agent avatar and an explicit actor tag so an AI agent reads
 * as a first-class collaborator sitting alongside humans (not an anonymous bot).
 */
export function Message({
  role,
  author,
  children,
  className,
  ...props
}: MessageProps): React.ReactElement {
  const isUser = role === 'user';
  const actorType = author?.actorType ?? (isUser ? 'human' : 'agent');

  return (
    <div
      className={cn(
        'flex w-full gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
        className,
      )}
      data-role={role}
      data-actor-type={actorType}
      {...props}
    >
      <MessageAvatar author={author} actorType={actorType} />
      <div className={cn('flex min-w-0 flex-1 flex-col gap-1', isUser && 'items-end')}>
        {author ? (
          <div
            className={cn(
              'flex items-center gap-1.5 text-xs',
              isUser && 'flex-row-reverse',
            )}
          >
            <span className="font-medium text-foreground">{author.name}</span>
            {actorType === 'agent' ? (
              <span className="rounded-sm bg-primary/10 px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                Agent
              </span>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export interface MessageContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  role: MessageRole;
  children: React.ReactNode;
}

export function MessageContent({
  role,
  children,
  className,
  ...props
}: MessageContentProps): React.ReactElement {
  const isUser = role === 'user';
  return (
    <div
      className={cn(
        'w-fit max-w-full rounded-lg px-3 py-2 text-sm',
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'border border-border bg-surface-elevated text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface MessageAvatarProps {
  author?: MessageAuthor;
  actorType: 'human' | 'agent' | 'system';
}

function MessageAvatar({
  author,
  actorType,
}: MessageAvatarProps): React.ReactElement {
  const initials =
    author?.initials ??
    (actorType === 'agent' ? 'AI' : actorType === 'system' ? 'SYS' : 'You');
  return (
    <Avatar actorType={actorType === 'system' ? 'agent' : actorType} size="default" className="mt-0.5">
      {author?.avatarUrl ? (
        <AvatarImage src={author.avatarUrl} alt={author.name} />
      ) : null}
      <AvatarFallback actorType={actorType === 'system' ? 'agent' : actorType}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
