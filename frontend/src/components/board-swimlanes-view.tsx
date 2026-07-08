'use client';

import * as React from 'react';
import type { Cycle, Epic, Story, WorkflowState } from '@landi-flow/core/types';
import { cn } from '@landi-flow/ui';
import { buildBoardSwimlanes } from '@/lib/board-grouping';
import type { BoardGroupBy } from '@/lib/board-swimlane-preference';
import { BoardColumnsGrid } from '@/components/board-columns-grid';

export interface BoardSwimlanesViewProps {
  workspaceId: string;
  stories: Story[];
  workflowStates: WorkflowState[];
  storyTitles: Record<string, string>;
  groupBy: BoardGroupBy;
  epics: Epic[];
  cycles: Cycle[];
  onCardSelect?: (storyId: string) => void;
  selectedStoryId?: string | null;
  className?: string;
}

/** CAP-031: horizontal swimlanes grouped by epic or cycle. */
export function BoardSwimlanesView({
  workspaceId,
  stories,
  workflowStates,
  storyTitles,
  groupBy,
  epics,
  cycles,
  onCardSelect,
  selectedStoryId,
  className,
}: BoardSwimlanesViewProps): React.ReactElement {
  const swimlanes = React.useMemo(
    () => buildBoardSwimlanes(stories, groupBy, epics, cycles),
    [stories, groupBy, epics, cycles],
  );

  return (
    <div
      className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto', className)}
      data-testid="board-swimlanes-view"
      data-cap="CAP-031"
    >
      {swimlanes.map((lane) => (
        <section
          key={lane.id}
          className="border-b border-border last:border-b-0"
          data-testid="board-swimlane"
          data-swimlane-id={lane.id}
        >
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-canvas/95 px-4 py-2 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-foreground">{lane.label}</h3>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {lane.stories.length}
            </span>
          </header>
          <BoardColumnsGrid
            workspaceId={workspaceId}
            stories={lane.stories}
            workflowStates={workflowStates}
            storyTitles={storyTitles}
            onCardSelect={onCardSelect}
            selectedStoryId={selectedStoryId}
            compact
          />
        </section>
      ))}
    </div>
  );
}
