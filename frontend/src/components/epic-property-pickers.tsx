'use client';

import * as React from 'react';
import type { EpicPriority, EpicStatusCategory } from '@landi-flow/core/types';
import {
  Badge,
  StoryPriorityBadge,
  cn,
  useTranslations,
} from '@landi-flow/ui';
import { Check } from 'lucide-react';
import {
  EPIC_BOARD_COLUMNS,
  EPIC_STATUS_IDS,
  EPIC_STATUS_LABELS,
  getEpicStatusCategory,
} from '@/lib/epic-status';
import { useEpicStore } from '@/hooks/use-epic-store';

const EPIC_PRIORITIES: EpicPriority[] = ['none', 'low', 'medium', 'high', 'urgent'];

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
  testId?: string;
}

function PopoverOption({
  selected = false,
  onSelect,
  children,
  testId,
}: PopoverOptionProps): React.ReactElement {
  const close = useClosePopover();
  return (
    <button
      type="button"
      role="option"
      data-testid={testId}
      aria-selected={selected ? 'true' : 'false'}
      onClick={() => {
        onSelect();
        close?.();
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

const statusVariant: Record<
  EpicStatusCategory,
  'statusTodo' | 'statusInProgress' | 'statusDone' | 'secondary'
> = {
  backlog: 'statusTodo',
  planned: 'statusTodo',
  in_progress: 'statusInProgress',
  completed: 'statusDone',
  cancelled: 'secondary',
};

export interface EpicStatusPickerProps {
  statusId: string;
  onSelect: (statusId: string) => void;
}

export function EpicStatusPicker({
  statusId,
  onSelect,
}: EpicStatusPickerProps): React.ReactElement {
  const t = useTranslations('epics');
  const { epics } = useEpicStore();
  const statusCategory = React.useMemo((): EpicStatusCategory => {
    const match = Object.entries(EPIC_STATUS_IDS).find(([, id]) => id === statusId);
    if (match) {
      return match[0] as EpicStatusCategory;
    }
    const sample = epics[0];
    return sample ? getEpicStatusCategory(sample) : 'backlog';
  }, [statusId, epics]);

  return (
    <InlinePopover
      testId="epic-status-picker"
      trigger={
        <Badge variant={statusVariant[statusCategory]} className="cursor-pointer capitalize">
          {t(`status.${statusCategory}`)}
        </Badge>
      }
    >
      {EPIC_BOARD_COLUMNS.map((category) => (
        <PopoverOption
          key={category}
          selected={EPIC_STATUS_IDS[category] === statusId}
          onSelect={() => onSelect(EPIC_STATUS_IDS[category])}
        >
          <Badge variant={statusVariant[category]} size="sm" className="capitalize">
            {EPIC_STATUS_LABELS[category]}
          </Badge>
        </PopoverOption>
      ))}
    </InlinePopover>
  );
}

export interface EpicPriorityPickerProps {
  priority: EpicPriority;
  onSelect: (priority: EpicPriority) => void;
}

export function EpicPriorityPicker({
  priority,
  onSelect,
}: EpicPriorityPickerProps): React.ReactElement {
  return (
    <InlinePopover
      testId="epic-priority-picker"
      trigger={
        <span className="cursor-pointer">
          <StoryPriorityBadge priority={priority} />
        </span>
      }
    >
      {EPIC_PRIORITIES.map((option) => (
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
