'use client';

import * as React from 'react';
import { Button, cn } from '@landi-flow/ui';
import { LayoutGrid, Layers } from 'lucide-react';
import type { BoardGroupBy } from '@/lib/board-swimlane-preference';

export interface BoardToolbarProps {
  groupBy: BoardGroupBy;
  onGroupByChange: (value: BoardGroupBy) => void;
  storyCount: number;
  className?: string;
}

const GROUP_OPTIONS: Array<{ value: BoardGroupBy; label: string }> = [
  { value: 'none', label: 'Flat' },
  { value: 'epic', label: 'Epic' },
  { value: 'cycle', label: 'Cycle' },
];

/** CAP-019 / CAP-031: board header with swimlane grouping controls. */
export function BoardToolbar({
  groupBy,
  onGroupByChange,
  storyCount,
  className,
}: BoardToolbarProps): React.ReactElement {
  return (
    <header
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2',
        className,
      )}
      data-testid="board-toolbar"
      data-cap="CAP-019"
    >
      <div className="flex items-center gap-2">
        <LayoutGrid className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-foreground">Story Board</h2>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {storyCount} stories
        </span>
      </div>

      <div
        className="flex items-center gap-2"
        data-testid="board-swimlane-controls"
        data-cap="CAP-031"
        role="group"
        aria-label="Swimlane grouping"
      >
        <Layers className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="text-xs text-muted-foreground">Group by</span>
        <div className="inline-flex rounded-md border border-border bg-surface-elevated/40 p-0.5">
          {GROUP_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={groupBy === option.value ? 'default' : 'ghost'}
              className="h-7 px-2.5 text-xs"
              data-testid={`board-group-by-${option.value}`}
              aria-pressed={groupBy === option.value}
              onClick={() => onGroupByChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </header>
  );
}
