'use client';

import * as React from 'react';
import type { Cycle, Epic, StoryPriority, Team, WorkflowState } from '@landi-flow/core/types';
import type { TaxonomyLabel } from '@/lib/taxonomy/taxonomy-types';
import {
  Badge,
  EpicBadge,
  MemberChip,
  StoryPriorityBadge,
  cn,
  type PickerMember,
} from '@landi-flow/ui';
import { Check, ChevronDown, Bot, User, UserMinus, Users } from 'lucide-react';
import { getEpicStatusCategory } from '@/lib/epic-status';
import { DEMO_WORKFLOW_STATE_ROWS } from '@/lib/seed-data';
import { useEpicStore } from '@/hooks/use-epic-store';
import { isMockAuthEnabled } from '@/lib/api/config';
import { getWorkflowStatesForTeam } from '@/lib/api/workspace-context';
import { workflowStateBadgeVariant } from '@/lib/workflow-state-display';

const STORY_PRIORITIES: StoryPriority[] = ['none', 'low', 'medium', 'high', 'urgent'];

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

export function PropertyEmptyValue({
  children = 'None',
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <span className={cn('italic text-muted-foreground', className)}>{children}</span>
  );
}

export interface TeamPickerProps {
  teams: Team[];
  teamId: string;
  onSelect: (teamId: string) => void;
}

export function TeamPicker({
  teams,
  teamId,
  onSelect,
}: TeamPickerProps): React.ReactElement {
  const selected = teams.find((team) => team.id === teamId) ?? null;

  return (
    <InlinePopover
      testId="story-team-picker"
      trigger={
        selected ? (
          <span className="inline-flex cursor-pointer items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{selected.name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-foreground-subtle" />
          </span>
        ) : (
          <span className="inline-flex cursor-pointer items-center gap-1.5">
            <PropertyEmptyValue />
            <ChevronDown className="h-3.5 w-3.5 text-foreground-subtle" />
          </span>
        )
      }
    >
      {teams.map((team) => (
        <PopoverOption
          key={team.id}
          selected={team.id === teamId}
          onSelect={() => onSelect(team.id)}
        >
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{team.name}</span>
        </PopoverOption>
      ))}
    </InlinePopover>
  );
}

export interface CyclePickerProps {
  cycles: Cycle[];
  cycleId: string | null;
  onSelect: (cycleId: string | null) => void;
}

export function CyclePicker({
  cycles,
  cycleId,
  onSelect,
}: CyclePickerProps): React.ReactElement {
  const selected = cycleId ? cycles.find((cycle) => cycle.id === cycleId) ?? null : null;

  return (
    <InlinePopover
      testId="story-cycle-picker"
      trigger={
        selected ? (
          <span className="inline-flex cursor-pointer items-center gap-1.5">
            <span>{selected.name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-foreground-subtle" />
          </span>
        ) : (
          <span className="inline-flex cursor-pointer items-center gap-1.5">
            <PropertyEmptyValue />
            <ChevronDown className="h-3.5 w-3.5 text-foreground-subtle" />
          </span>
        )
      }
    >
      <PopoverOption selected={cycleId === null} onSelect={() => onSelect(null)}>
        <PropertyEmptyValue />
      </PopoverOption>
      {cycles.map((cycle) => (
        <PopoverOption
          key={cycle.id}
          selected={cycle.id === cycleId}
          onSelect={() => onSelect(cycle.id)}
        >
          <span className="text-sm">{cycle.name}</span>
        </PopoverOption>
      ))}
    </InlinePopover>
  );
}

export interface StoryTypePickerProps {
  types: TaxonomyLabel[];
  typeId: string | null;
  onSelect: (typeId: string | null) => void;
}

export function StoryTypePicker({
  types,
  typeId,
  onSelect,
}: StoryTypePickerProps): React.ReactElement {
  const selected = typeId ? types.find((type) => type.id === typeId) ?? null : null;

  return (
    <InlinePopover
      testId="story-type-picker"
      trigger={
        selected ? (
          <span className="inline-flex cursor-pointer items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: selected.color }}
              aria-hidden
            />
            <span>{selected.name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-foreground-subtle" />
          </span>
        ) : (
          <span className="inline-flex cursor-pointer items-center gap-1.5">
            <PropertyEmptyValue>Feature</PropertyEmptyValue>
            <ChevronDown className="h-3.5 w-3.5 text-foreground-subtle" />
          </span>
        )
      }
    >
      {types.map((type) => (
        <PopoverOption
          key={type.id}
          selected={type.id === typeId}
          onSelect={() => onSelect(type.id)}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: type.color }}
            aria-hidden
          />
          <span className="text-sm">{type.name}</span>
        </PopoverOption>
      ))}
    </InlinePopover>
  );
}

export interface EstimatePickerProps {
  estimate: number | null;
  onChange: (estimate: number | null) => void;
}

export function EstimatePicker({
  estimate,
  onChange,
}: EstimatePickerProps): React.ReactElement {
  const [draft, setDraft] = React.useState(
    estimate != null ? String(estimate) : '',
  );

  React.useEffect(() => {
    setDraft(estimate != null ? String(estimate) : '');
  }, [estimate]);

  const commit = React.useCallback((): void => {
    const trimmed = draft.trim();
    if (!trimmed) {
      onChange(null);
      return;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      onChange(parsed);
    }
  }, [draft, onChange]);

  return (
    <input
      type="number"
      min={0}
      step={1}
      data-testid="story-estimate-picker"
      value={draft}
      placeholder="Unestimated"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          commit();
        }
      }}
      className={cn(
        'w-full bg-transparent text-sm outline-none placeholder:italic placeholder:text-muted-foreground',
      )}
    />
  );
}

export interface DueDatePickerProps {
  dueDate: string | null;
  onChange: (dueDate: string | null) => void;
}

export function DueDatePicker({
  dueDate,
  onChange,
}: DueDatePickerProps): React.ReactElement {
  const value = dueDate ? dueDate.slice(0, 10) : '';

  return (
    <input
      type="date"
      data-testid="story-due-date-picker"
      value={value}
      onChange={(event) => {
        const next = event.target.value;
        onChange(next ? `${next}T12:00:00.000Z` : null);
      }}
      className={cn(
        'w-full bg-transparent text-sm outline-none',
        !value ? 'text-muted-foreground italic' : undefined,
      )}
      placeholder="No date"
    />
  );
}

export interface StoryTemplatePickerProps {
  templates: Array<{ id: string; name: string }>;
  templateId: string;
  onSelect: (templateId: string) => void;
}

export function StoryTemplatePicker({
  templates,
  templateId,
  onSelect,
}: StoryTemplatePickerProps): React.ReactElement {
  const selected = templateId
    ? templates.find((template) => template.id === templateId) ?? null
    : null;

  return (
    <InlinePopover
      testId="create-story-template"
      trigger={
        selected ? (
          <span className="inline-flex cursor-pointer items-center gap-1.5">
            <span>{selected.name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-foreground-subtle" />
          </span>
        ) : (
          <span className="inline-flex cursor-pointer items-center gap-1.5">
            <PropertyEmptyValue />
            <ChevronDown className="h-3.5 w-3.5 text-foreground-subtle" />
          </span>
        )
      }
    >
      <PopoverOption selected={templateId === ''} onSelect={() => onSelect('')}>
        <PropertyEmptyValue />
      </PopoverOption>
      {templates.map((template) => (
        <PopoverOption
          key={template.id}
          selected={template.id === templateId}
          onSelect={() => onSelect(template.id)}
        >
          <span className="text-sm">{template.name}</span>
        </PopoverOption>
      ))}
    </InlinePopover>
  );
}

export interface CustomFieldPickerProps {
  label: string;
  value: string | null;
  options: string[];
  onSelect: (value: string | null) => void;
  testId?: string;
}

export function CustomFieldPicker({
  label,
  value,
  options,
  onSelect,
  testId,
}: CustomFieldPickerProps): React.ReactElement {
  return (
    <InlinePopover
      testId={testId}
      trigger={
        value ? (
          <span className="inline-flex cursor-pointer items-center gap-1.5">
            <span>{value}</span>
            <ChevronDown className="h-3.5 w-3.5 text-foreground-subtle" />
          </span>
        ) : (
          <span className="inline-flex cursor-pointer items-center gap-1.5">
            <PropertyEmptyValue />
            <ChevronDown className="h-3.5 w-3.5 text-foreground-subtle" />
          </span>
        )
      }
    >
      <PopoverOption selected={value === null} onSelect={() => onSelect(null)}>
        <PropertyEmptyValue />
      </PopoverOption>
      {options.map((option) => (
        <PopoverOption
          key={option}
          selected={value === option}
          onSelect={() => onSelect(option)}
        >
          <span className="text-sm">{option}</span>
        </PopoverOption>
      ))}
      <span className="sr-only">{label}</span>
    </InlinePopover>
  );
}

export interface StoryStatusPickerProps {
  workflowStateId: string;
  onSelect: (workflowStateId: string) => void;
  workflowStates?: WorkflowState[];
}

function resolvePickerWorkflowStates(workflowStates?: WorkflowState[]): WorkflowState[] {
  if (workflowStates && workflowStates.length > 0) {
    return workflowStates;
  }
  if (isMockAuthEnabled()) {
    return DEMO_WORKFLOW_STATE_ROWS;
  }
  const cached = getWorkflowStatesForTeam();
  return cached.length > 0 ? cached : DEMO_WORKFLOW_STATE_ROWS;
}

export function StoryStatusPicker({
  workflowStateId,
  onSelect,
  workflowStates,
}: StoryStatusPickerProps): React.ReactElement {
  const states = React.useMemo(
    () => resolvePickerWorkflowStates(workflowStates),
    [workflowStates],
  );
  const selected = states.find((state) => state.id === workflowStateId) ?? states[0] ?? null;

  return (
    <InlinePopover
      testId="story-status-picker"
      trigger={
        selected ? (
          <Badge
            variant={workflowStateBadgeVariant(selected.id, selected.category)}
            className="cursor-pointer"
          >
            {selected.name}
          </Badge>
        ) : (
          <Badge variant="secondary" className="cursor-pointer">
            Unknown
          </Badge>
        )
      }
    >
      {states.map((state) => (
        <PopoverOption
          key={state.id}
          selected={state.id === workflowStateId}
          onSelect={() => onSelect(state.id)}
        >
          <Badge
            variant={workflowStateBadgeVariant(state.id, state.category)}
            size="sm"
          >
            {state.name}
          </Badge>
        </PopoverOption>
      ))}
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
