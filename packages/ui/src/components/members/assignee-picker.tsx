'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import { Bot, Check, ChevronDown, User, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * A member that can be assigned to a Story or Epic. Humans and AGENTS share one shape
 * so the picker lists them side by side — the study differentiator "agents as
 * first-class assignees / collaborators" (task-09k). Structurally compatible with
 * `AssignableMember` from `@landi-flow/core`.
 */
export interface PickerMember {
  kind: 'human' | 'agent';
  id: string;
  name: string;
  avatar_url?: string | null;
  presence?: 'online' | 'working' | 'idle' | 'offline';
  subtitle?: string | null;
  /** task-09l: agent runtime metadata for delegate badges and console copy. */
  runtime?: 'native' | 'external_mcp' | 'attribution_only';
  vendor?: string | null;
  connection_state?: 'connected' | 'disconnected' | 'never_connected';
  is_builtin?: boolean;
}

export interface AssigneePickerProps {
  /** Unified roster (humans + agents). */
  members: PickerMember[];
  /** Currently assigned human (assignee for a Story, lead for an Epic). */
  humanId: string | null;
  /** Currently assigned agent delegate (a first-class assignee). */
  agentId: string | null;
  /** Label for the human slot ("Assignee" for Stories, "Lead" for Epics). */
  humanLabel?: string;
  onSelectHuman: (id: string | null) => void;
  onSelectAgent: (id: string | null) => void;
  disabled?: boolean;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) {
    return '?';
  }
  if (parts.length === 1) {
    return first.slice(0, 2).toUpperCase();
  }
  const last = parts[parts.length - 1] ?? first;
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
}

export interface MemberAvatarProps {
  member: PickerMember;
  size?: 'xs' | 'sm' | 'default' | 'lg';
  active?: boolean;
  className?: string;
}

/** Avatar honoring the human=circle / agent=squircle brand language. */
export function MemberAvatar({
  member,
  size = 'sm',
  active,
  className,
}: MemberAvatarProps): React.ReactElement {
  const isWorking = member.kind === 'agent' && (active ?? member.presence === 'working');
  return (
    <Avatar
      actorType={member.kind}
      size={size}
      active={isWorking}
      className={className}
      aria-label={`${member.name} (${member.kind})`}
    >
      {member.avatar_url ? (
        <AvatarImage src={member.avatar_url} alt={member.name} />
      ) : null}
      <AvatarFallback actorType={member.kind}>{initials(member.name)}</AvatarFallback>
    </Avatar>
  );
}

/** Compact chip: avatar + name + a kind marker (human/agent) for inline display. */
export function MemberChip({
  member,
  className,
}: {
  member: PickerMember;
  className?: string;
}): React.ReactElement {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <MemberAvatar member={member} size="xs" />
      <span className="truncate text-sm text-foreground">{member.name}</span>
      {member.kind === 'agent' ? (
        <Bot className="h-3 w-3 shrink-0 text-primary" aria-label="AI agent" />
      ) : null}
    </span>
  );
}

/**
 * Assignee picker — one dropdown that surfaces humans and agents together. Selecting a
 * human fills the human slot (assignee / lead); selecting an agent fills the agent
 * delegate slot. Both may be set at once (human owns, agent acts).
 */
export function AssigneePicker({
  members,
  humanId,
  agentId,
  humanLabel = 'Assignee',
  onSelectHuman,
  onSelectAgent,
  disabled = false,
  className,
}: AssigneePickerProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const humans = React.useMemo(() => members.filter((m) => m.kind === 'human'), [members]);
  const agents = React.useMemo(() => members.filter((m) => m.kind === 'agent'), [members]);

  const humanMember = React.useMemo(
    () => (humanId ? members.find((m) => m.kind === 'human' && m.id === humanId) ?? null : null),
    [members, humanId],
  );
  const agentMember = React.useMemo(
    () => (agentId ? members.find((m) => m.kind === 'agent' && m.id === agentId) ?? null : null),
    [members, agentId],
  );

  React.useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleSelect = React.useCallback(
    (member: PickerMember): void => {
      if (member.kind === 'human') {
        onSelectHuman(member.id === humanId ? null : member.id);
      } else {
        onSelectAgent(member.id === agentId ? null : member.id);
      }
    },
    [onSelectHuman, onSelectAgent, humanId, agentId],
  );

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        data-testid="assignee-picker-trigger"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open ? 'true' : 'false'}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-md border border-border bg-surface-overlay px-2.5 py-1.5 text-left text-sm',
          'hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          {humanMember ? (
            <MemberChip member={humanMember} />
          ) : (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              No {humanLabel.toLowerCase()}
            </span>
          )}
          {agentMember ? (
            <MemberChip member={agentMember} />
          ) : null}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-foreground-subtle" />
      </button>

      {open ? (
        <div
          className={cn(
            'absolute left-0 z-50 mt-1 w-full min-w-[240px] overflow-hidden rounded-lg border border-border bg-surface-overlay shadow-xl',
          )}
        >
          <Command className="flex flex-col" label="Assign a member">
            <div className="border-b border-border px-3">
              <Command.Input
                placeholder="Assign to a person or agent…"
                className={cn(
                  'flex h-10 w-full bg-transparent text-sm text-foreground outline-none',
                  'placeholder:text-foreground-subtle',
                )}
              />
            </div>
            <Command.List className="max-h-[280px] overflow-y-auto p-1.5">
              <Command.Empty className="py-4 text-center text-sm text-muted-foreground">
                No members found.
              </Command.Empty>

              {(humanId || agentId) ? (
                <Command.Group
                  heading="Assigned"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-foreground-subtle"
                >
                  {humanMember ? (
                    <UnassignRow
                      label={`Remove ${humanLabel.toLowerCase()} · ${humanMember.name}`}
                      onSelect={() => onSelectHuman(null)}
                    />
                  ) : null}
                  {agentMember ? (
                    <UnassignRow
                      label={`Remove agent · ${agentMember.name}`}
                      onSelect={() => onSelectAgent(null)}
                    />
                  ) : null}
                </Command.Group>
              ) : null}

              <MemberGroup
                heading="People"
                icon={<User className="h-3.5 w-3.5" />}
                members={humans}
                selectedId={humanId}
                onSelect={handleSelect}
              />
              <MemberGroup
                heading="Agents"
                icon={<Bot className="h-3.5 w-3.5 text-primary" />}
                members={agents}
                selectedId={agentId}
                onSelect={handleSelect}
              />
            </Command.List>
          </Command>
        </div>
      ) : null}
    </div>
  );
}

function UnassignRow({
  label,
  onSelect,
}: {
  label: string;
  onSelect: () => void;
}): React.ReactElement {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground',
        'aria-selected:bg-white/5 data-[selected=true]:bg-white/5',
      )}
    >
      <UserMinus className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
    </Command.Item>
  );
}

function MemberGroup({
  heading,
  icon,
  members,
  selectedId,
  onSelect,
}: {
  heading: string;
  icon: React.ReactNode;
  members: PickerMember[];
  selectedId: string | null;
  onSelect: (member: PickerMember) => void;
}): React.ReactElement | null {
  if (members.length === 0) {
    return null;
  }
  return (
    <Command.Group
      heading={heading}
      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-foreground-subtle"
    >
      {members.map((member) => {
        const selected = member.id === selectedId;
        return (
          <Command.Item
            key={`${member.kind}-${member.id}`}
            data-testid={member.kind === 'agent' ? 'assignee-option-agent' : 'assignee-option-human'}
            value={`${member.name} ${member.kind} ${member.id}`}
            onSelect={() => onSelect(member)}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm',
              'aria-selected:bg-primary/10 data-[selected=true]:bg-primary/10',
            )}
          >
            <MemberAvatar member={member} size="sm" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-foreground">{member.name}</span>
              {member.subtitle ? (
                <span className="truncate text-xs text-foreground-subtle">{member.subtitle}</span>
              ) : null}
            </span>
            {member.kind === 'agent' ? (
              <span className="shrink-0" aria-hidden>
                {icon}
              </span>
            ) : null}
            {selected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
          </Command.Item>
        );
      })}
    </Command.Group>
  );
}
