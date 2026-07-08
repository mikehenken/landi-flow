'use client';

import * as React from 'react';
import type { Epic, StoryPriority } from '@landi-flow/core/types';
import type { StoryWorkflowStatus } from '@landi-flow/ui';
import {
  Badge,
  EpicBadge,
  MemberChip,
  StoryPriorityBadge,
  cn,
  type PickerMember,
} from '@landi-flow/ui';
import { Check, ChevronDown, Bot, User, UserMinus } from 'lucide-react';
import { getEpicStatusCategory } from '@/lib/epic-status';
import { DEMO_WORKFLOW_STATE_ROWS } from '@/lib/seed-data';
import { useEpicStore } from '@/hooks/use-epic-store';
import { workflowStateToStatus } from '@/lib/workflow-states';

const STORY_PRIORITIES: StoryPriority[] = ['none', 'low', 'medium', 'high', 'urgent'];

const statusVariant: Record<
  StoryWorkflowStatus,
  'statusTodo' | 'statusInProgress' | 'statusDone' | 'secondary'
> = {
  todo: 'statusTodo',
  in_progress: 'statusInProgress',
  done: 'statusDone',
  canceled: 'secondary',
};

function useDismissOnOutside(
  open: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  React.useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, containerRef, onClose]);
}

const PopoverCloseContext = React.createContext<(() => void) | null>(null);

function useClosePopover(): (() => void) | null {
  return React.useContext(PopoverCloseContext);
}

interface InlinePopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  testId?: string;
}

/** Click-to-open popover shell — ≤2 clicks to pick an option. */
function InlinePopover({
  trigger,
  children,
  className,
  testId,
}: InlinePopoverProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const close = React.useCallback(() => setOpen(false), []);
  useDismissOnOutside(open, containerRef, close);

  return (
    <PopoverCloseContext.Provider value={close}>
      <div ref={containerRef} className={cn('relative inline-flex', className)}>
        <button
          type="button"
          data-testid={testId}
          onClick={() => setOpen((value) => !value)}
          aria-haspopup="listbox"
          aria-expanded={open ? 'true' : 'false'}
          className={cn(
            'inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'hover:opacity-90',
          )}
        >
          {trigger}
        </button>
        {open ? (
          <div
            role="listbox"
            className={cn(
              'absolute left-0 top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-lg border border-border bg-surface-overlay p-1 shadow-xl',
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
    </PopoverCloseContext.Provider>
  );
}

interface PopoverOptionProps {
  selected?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}

function PopoverOption({
  selected = false,
  onSelect,
  children,
  closeOnSelect = true,
  testId,
}: PopoverOptionProps & { closeOnSelect?: boolean; testId?: string }): React.ReactElement {
  const close = useClosePopover();
  return (
    <button
      type="button"
      role="option"
      data-testid={testId}
      aria-selected={selected ? 'true' : 'false'}
      onClick={() => {
        onSelect();
        if (closeOnSelect) {
          close?.();
        }
      }}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
        'hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none',
        selected ? 'bg-primary/10' : undefined,
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">{children}</span>
      {selected ? <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden /> : null}
    </button>
  );
}

export interface StoryStatusPickerProps {
  workflowStateId: string;
  onSelect: (workflowStateId: string) => void;
}

export function StoryStatusPicker({
  workflowStateId,
  onSelect,
}: StoryStatusPickerProps): React.ReactElement {
  const status = workflowStateToStatus(workflowStateId);

  return (
    <InlinePopover
      testId="story-status-picker"
      trigger={
        <Badge variant={statusVariant[status]} className="cursor-pointer capitalize">
          {status.replace('_', ' ')}
        </Badge>
      }
    >
      {DEMO_WORKFLOW_STATE_ROWS.map((state) => {
        const stateKey = workflowStateToStatus(state.id);
        return (
          <PopoverOption
            key={state.id}
            selected={state.id === workflowStateId}
            onSelect={() => onSelect(state.id)}
          >
            <Badge variant={statusVariant[stateKey]} size="sm" className="capitalize">
              {state.name}
            </Badge>
          </PopoverOption>
        );
      })}
    </InlinePopover>
  );
}

export interface StoryPriorityPickerProps {
  priority: StoryPriority;
  onSelect: (priority: StoryPriority) => void;
}

export function StoryPriorityPicker({
  priority,
  onSelect,
}: StoryPriorityPickerProps): React.ReactElement {
  return (
    <InlinePopover
      testId="story-priority-picker"
      trigger={
        <span className="cursor-pointer">
          <StoryPriorityBadge priority={priority} />
        </span>
      }
    >
      {STORY_PRIORITIES.map((option) => (
        <PopoverOption
          key={option}
          selected={option === priority}
          onSelect={() => onSelect(option)}
        >
          <StoryPriorityBadge priority={option} />
        </PopoverOption>
      ))}
    </InlinePopover>
  );
}

export interface StoryEpicPickerProps {
  epicId: string | null;
  onSelect: (epicId: string | null) => void;
}

export function StoryEpicPicker({
  epicId,
  onSelect,
}: StoryEpicPickerProps): React.ReactElement {
  const { epics } = useEpicStore();
  const selectedEpic = epicId ? epics.find((entry) => entry.id === epicId) ?? null : null;

  return (
    <InlinePopover
      testId="story-epic-picker"
      trigger={
        selectedEpic ? (
          <span className="cursor-pointer">
            <EpicBadge
              name={selectedEpic.name}
              status={getEpicStatusCategory(selectedEpic)}
              showLabel
            />
          </span>
        ) : (
          <Badge variant="outline" className="cursor-pointer text-muted-foreground">
            No Epic
          </Badge>
        )
      }
    >
      <PopoverOption selected={epicId === null} onSelect={() => onSelect(null)}>
        <span className="text-sm text-muted-foreground">No Epic</span>
      </PopoverOption>
      {epics.map((epic: Epic) => (
        <PopoverOption
          key={epic.id}
          selected={epic.id === epicId}
          onSelect={() => onSelect(epic.id)}
        >
          <EpicBadge name={epic.name} status={getEpicStatusCategory(epic)} showLabel />
        </PopoverOption>
      ))}
    </InlinePopover>
  );
}

export interface OwnerPickerProps {
  members: PickerMember[];
  ownerId: string | null;
  onSelect: (ownerId: string | null) => void;
}

/** Human-only single-select for Shortcut Owner (`assignee_id`). */
export function OwnerPicker({
  members,
  ownerId,
  onSelect,
}: OwnerPickerProps): React.ReactElement {
  const humans = React.useMemo(() => members.filter((member) => member.kind === 'human'), [members]);
  const owner = ownerId
    ? humans.find((member) => member.id === ownerId) ?? null
    : null;

  return (
    <InlinePopover
      testId="story-owner-picker"
      trigger={
        owner ? (
          <span className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-transparent px-1 py-0.5 hover:border-border">
            <MemberChip member={owner} />
            <ChevronDown className="h-3.5 w-3.5 text-foreground-subtle" />
          </span>
        ) : (
          <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface-overlay px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-white/5">
            <User className="h-3.5 w-3.5" />
            No owner
            <ChevronDown className="h-3.5 w-3.5 text-foreground-subtle" />
          </span>
        )
      }
    >
      {owner ? (
        <PopoverOption
          onSelect={() => onSelect(null)}
          selected={false}
        >
          <UserMinus className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Remove owner</span>
        </PopoverOption>
      ) : null}
      {humans.map((member) => (
        <PopoverOption
          key={member.id}
          selected={member.id === ownerId}
          onSelect={() => onSelect(member.id === ownerId ? null : member.id)}
        >
          <MemberChip member={member} />
        </PopoverOption>
      ))}
    </InlinePopover>
  );
}

export interface FollowersPickerProps {
  members: PickerMember[];
  followerIds: string[];
  onChange: (followerIds: string[]) => void;
}

/** Human multi-select for Shortcut Followers. */
export function FollowersPicker({
  members,
  followerIds,
  onChange,
}: FollowersPickerProps): React.ReactElement {
  const humans = React.useMemo(() => members.filter((member) => member.kind === 'human'), [members]);
  const selected = React.useMemo(
    () => humans.filter((member) => followerIds.includes(member.id)),
    [humans, followerIds],
  );

  const toggleFollower = React.useCallback(
    (memberId: string) => {
      if (followerIds.includes(memberId)) {
        onChange(followerIds.filter((id) => id !== memberId));
        return;
      }
      onChange([...followerIds, memberId]);
    },
    [followerIds, onChange],
  );

  return (
    <InlinePopover
      testId="story-followers-picker"
      trigger={
        selected.length > 0 ? (
          <span className="inline-flex cursor-pointer flex-wrap items-center gap-1.5 rounded-md border border-transparent px-1 py-0.5 hover:border-border">
            {selected.map((member) => (
              <MemberChip key={member.id} member={member} />
            ))}
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-foreground-subtle" />
          </span>
        ) : (
          <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface-overlay px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-white/5">
            <User className="h-3.5 w-3.5" />
            Add followers
            <ChevronDown className="h-3.5 w-3.5 text-foreground-subtle" />
          </span>
        )
      }
    >
      {humans.map((member) => (
        <PopoverOption
          key={member.id}
          selected={followerIds.includes(member.id)}
          onSelect={() => toggleFollower(member.id)}
          closeOnSelect={false}
        >
          <MemberChip member={member} />
        </PopoverOption>
      ))}
    </InlinePopover>
  );
}

export interface AgentDelegatePickerProps {
  members: PickerMember[];
  agentId: string | null;
  onSelectAgent: (agentId: string | null) => void;
}

/** Agent-only picker (CAP-017 — separate from Owner). */
export function AgentDelegatePicker({
  members,
  agentId,
  onSelectAgent,
}: AgentDelegatePickerProps): React.ReactElement {
  const agents = React.useMemo(() => members.filter((member) => member.kind === 'agent'), [members]);
  const agent = agentId ? agents.find((member) => member.id === agentId) ?? null : null;

  return (
    <InlinePopover
      testId="story-agent-delegate-picker"
      trigger={
        agent ? (
          <span className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-transparent px-1 py-0.5 hover:border-border">
            <MemberChip member={agent} />
            <ChevronDown className="h-3.5 w-3.5 text-foreground-subtle" />
          </span>
        ) : (
          <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface-overlay px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-white/5">
            <Bot className="h-3.5 w-3.5 text-primary" />
            No agent delegate
            <ChevronDown className="h-3.5 w-3.5 text-foreground-subtle" />
          </span>
        )
      }
    >
      {agent ? (
        <PopoverOption onSelect={() => onSelectAgent(null)} selected={false}>
          <UserMinus className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Remove agent delegate</span>
        </PopoverOption>
      ) : null}
      {agents.map((member) => (
        <PopoverOption
          key={member.id}
          selected={member.id === agentId}
          onSelect={() => onSelectAgent(member.id === agentId ? null : member.id)}
          testId={member.kind === 'agent' ? 'assignee-option-agent' : undefined}
        >
          <MemberChip member={member} />
          {member.kind === 'agent' && member.runtime === 'attribution_only' ? (
            <span className="ml-auto text-[10px] text-primary">Attribution</span>
          ) : member.kind === 'agent' &&
            member.runtime === 'external_mcp' &&
            member.connection_state !== 'connected' ? (
            <span className="ml-auto text-[10px] text-muted-foreground">Offline</span>
          ) : null}
        </PopoverOption>
      ))}
    </InlinePopover>
  );
}
