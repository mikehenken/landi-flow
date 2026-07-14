'use client';

import * as React from 'react';
import type { WorkflowState } from '@landi-flow/core/types';
import { Button, cn } from '@landi-flow/ui';
import { EyeOff, Plus } from 'lucide-react';
import {
  readHiddenColumnIds,
  toggleColumnVisibility,
} from '@/lib/views/board-column-preferences';

export interface BoardColumnControlsProps {
  teamId: string;
  workflowStates: WorkflowState[];
  onQuickAdd: (workflowStateId: string) => void;
  onVisibilityChange?: (hiddenIds: Set<string>) => void;
  className?: string;
}

/** CAP-020/021: column hide/show + quick-add controls. */
export function BoardColumnControls({
  teamId,
  workflowStates,
  onQuickAdd,
  onVisibilityChange,
  className,
}: BoardColumnControlsProps): React.ReactElement {
  const [hiddenIds, setHiddenIds] = React.useState<Set<string>>(() =>
    readHiddenColumnIds(teamId),
  );

  const handleToggle = (stateId: string): void => {
    const next = toggleColumnVisibility(teamId, stateId);
    setHiddenIds(new Set(next));
    onVisibilityChange?.(next);
  };

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2 border-b border-border px-4 py-2', className)}
      data-testid="board-column-controls"
      data-cap="CAP-020"
    >
      <span className="text-xs font-medium text-muted-foreground">Columns:</span>
      {workflowStates.map((state) => {
        const hidden = hiddenIds.has(state.id);
        return (
          <div key={state.id} className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant={hidden ? 'ghost' : 'outline'}
              data-testid={`board-column-toggle-${state.id}`}
              onClick={() => handleToggle(state.id)}
            >
              {hidden ? <EyeOff className="mr-1 h-3 w-3" /> : null}
              {state.name}
            </Button>
            {!hidden ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label={`Quick-add Story to ${state.name}`}
                data-testid={`board-column-quick-add-${state.id}`}
                data-cap="CAP-021"
                onClick={() => onQuickAdd(state.id)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function filterVisibleWorkflowStates(
  workflowStates: WorkflowState[],
  teamId: string,
): WorkflowState[] {
  const hidden = readHiddenColumnIds(teamId);
  return workflowStates.filter((state) => !hidden.has(state.id));
}
