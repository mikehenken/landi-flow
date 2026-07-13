'use client';

import * as React from 'react';
import type { Cycle, Epic, Story, WorkflowState } from '@landi-flow/core/types';
import { LiveList, LiveObject } from '@liveblocks/client';
import type { JsonObject } from '@liveblocks/client';
import { hydrateBoardRoom, storiesToBoardStorage } from '@landi-flow/collaboration';
import { useMutation, useStorage } from '@liveblocks/react/suspense';
import { Card, CardContent, CardHeader, CardTitle, cn } from '@landi-flow/ui';
import { BoardColumnsGrid } from '@/components/board-columns-grid';
import { BoardSwimlanesView } from '@/components/board-swimlanes-view';
import { isMockAuthEnabled } from '@/lib/api/config';
import { isLiveblocksConfigured } from '@/lib/liveblocks/config';
import type { BoardGroupBy } from '@/lib/board-swimlane-preference';
import { isWorkspaceUuid } from '@/lib/workspace/is-workspace-uuid';
import { CollaborativeRoom } from './collaboration-provider';
import { CursorOverlay, PresenceAvatars } from './presence-cursors';

export interface CollaborativeBoardProps {
  workspaceId: string;
  teamId: string;
  stories: Story[];
  workflowStates: WorkflowState[];
  storyTitles: Record<string, string>;
  onCardSelect?: (storyId: string) => void;
  selectedStoryId?: string | null;
  groupBy?: BoardGroupBy;
  epics?: Epic[];
  cycles?: Cycle[];
  className?: string;
  hiddenColumnIds?: Set<string>;
  onQuickAdd?: (workflowStateId: string) => void;
}

/** Live Kanban board with fractional-indexed card drag/drop. */
export function CollaborativeBoard({
  workspaceId,
  teamId,
  stories,
  workflowStates,
  storyTitles,
  onCardSelect,
  selectedStoryId,
  groupBy = 'none',
  epics = [],
  cycles = [],
  className,
  hiddenColumnIds,
  onQuickAdd,
}: CollaborativeBoardProps): React.ReactElement {
  const liveblocksReady =
    isLiveblocksConfigured() &&
    !isMockAuthEnabled() &&
    isWorkspaceUuid(workspaceId);
  const useSwimlanes = groupBy !== 'none';
  const useOfflineBoard = useSwimlanes || isMockAuthEnabled() || !liveblocksReady;
  const hydrated = React.useMemo(
    () =>
      liveblocksReady && !useOfflineBoard
        ? hydrateBoardRoom(workspaceId, teamId, stories, workflowStates)
        : null,
    [liveblocksReady, useOfflineBoard, workspaceId, teamId, stories, workflowStates],
  );

  if (useOfflineBoard || hydrated === null) {
    return (
    <OfflineBoard
      workspaceId={workspaceId}
      stories={stories}
      workflowStates={workflowStates}
        storyTitles={storyTitles}
        onCardSelect={onCardSelect}
        selectedStoryId={selectedStoryId}
        groupBy={groupBy}
        epics={epics}
        cycles={cycles}
        className={className}
        hiddenColumnIds={hiddenColumnIds}
        onQuickAdd={onQuickAdd}
      />
    );
  }

  return (
    <CollaborativeRoom
      roomId={hydrated.roomId}
      initialStorage={hydrated.initialStorage as unknown as JsonObject}
    >
      <BoardInner
        stories={stories}
        workflowStates={workflowStates}
        storyTitles={storyTitles}
        onCardSelect={onCardSelect}
        selectedStoryId={selectedStoryId}
        className={className}
      />
    </CollaborativeRoom>
  );
}

interface OfflineBoardProps {
  workspaceId: string;
  stories: Story[];
  workflowStates: WorkflowState[];
  storyTitles: Record<string, string>;
  onCardSelect?: (storyId: string) => void;
  selectedStoryId?: string | null;
  groupBy?: BoardGroupBy;
  epics?: Epic[];
  cycles?: Cycle[];
  className?: string;
  hiddenColumnIds?: Set<string>;
  onQuickAdd?: (workflowStateId: string) => void;
}

/** Local-only Kanban when Liveblocks keys are absent (mock auth / local dev). */
function OfflineBoard({
  workspaceId,
  stories,
  workflowStates,
  storyTitles,
  onCardSelect,
  selectedStoryId,
  groupBy = 'none',
  epics = [],
  cycles = [],
  className,
  hiddenColumnIds,
  onQuickAdd,
}: OfflineBoardProps): React.ReactElement {
  return (
    <div className={cn('relative flex h-full flex-col', className)} data-testid="story-board">
      {groupBy !== 'none' ? (
        <BoardSwimlanesView
          workspaceId={workspaceId}
          stories={stories}
          workflowStates={workflowStates}
          storyTitles={storyTitles}
          groupBy={groupBy}
          epics={epics}
          cycles={cycles}
          onCardSelect={onCardSelect}
          selectedStoryId={selectedStoryId}
        />
      ) : (
        <BoardColumnsGrid
          workspaceId={workspaceId}
          stories={stories}
          workflowStates={workflowStates}
          storyTitles={storyTitles}
          onCardSelect={onCardSelect}
          selectedStoryId={selectedStoryId}
          hiddenColumnIds={hiddenColumnIds}
          onQuickAdd={onQuickAdd}
        />
      )}
    </div>
  );
}

interface BoardInnerProps {
  stories: Story[];
  workflowStates: WorkflowState[];
  storyTitles: Record<string, string>;
  onCardSelect?: (storyId: string) => void;
  selectedStoryId?: string | null;
  className?: string;
}

function BoardInner({
  stories,
  workflowStates,
  storyTitles,
  onCardSelect,
  selectedStoryId,
  className,
}: BoardInnerProps): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const storageColumns = useStorage((root) => {
    const raw = root.columns;
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw as Array<{ statusId: string; cards: string[] }>;
  });

  const columns = React.useMemo(() => {
    const stored = storageColumns ?? [];
    const storedCardCount = stored.reduce(
      (total, column) => total + (column.cards?.length ?? 0),
      0,
    );
    if (stored.length > 0 && (storedCardCount > 0 || stories.length === 0)) {
      return stored;
    }
    return storiesToBoardStorage(stories, workflowStates).columns as Array<{
      statusId: string;
      cards: string[];
    }>;
  }, [storageColumns, stories, workflowStates]);

  const moveCard = useMutation(
    ({ storage }, columnIndex: number, fromIndex: number, toIndex: number) => {
      const columnsList = storage.get('columns');
      if (!(columnsList instanceof LiveList)) {
        return;
      }
      const column = columnsList.get(columnIndex);
      if (!(column instanceof LiveObject)) {
        return;
      }
      const cards = column.get('cards');
      if (cards instanceof LiveList) {
        cards.move(fromIndex, toIndex);
      }
    },
    []
  );

  const moveCardToColumn = useMutation(
    (
      { storage },
      fromColumnIndex: number,
      cardIndex: number,
      toColumnIndex: number,
      toIndex: number
    ) => {
      const columnsList = storage.get('columns');
      if (!(columnsList instanceof LiveList)) {
        return;
      }
      const fromColumn = columnsList.get(fromColumnIndex);
      const toColumn = columnsList.get(toColumnIndex);
      if (!(fromColumn instanceof LiveObject) || !(toColumn instanceof LiveObject)) {
        return;
      }
      const fromCards = fromColumn.get('cards');
      const toCards = toColumn.get('cards');
      if (fromCards instanceof LiveList && toCards instanceof LiveList) {
        const cardId = fromCards.get(cardIndex);
        if (cardId === undefined) {
          return;
        }
        fromCards.delete(cardIndex);
        toCards.insert(toIndex, cardId);
      }
    },
    []
  );

  const stateNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const state of workflowStates) {
      map.set(state.id, state.name);
    }
    return map;
  }, [workflowStates]);

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    columnIndex: number,
    cardIndex: number
  ): void => {
    event.dataTransfer.setData(
      'application/landi-board',
      JSON.stringify({ columnIndex, cardIndex })
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (
    event: React.DragEvent<HTMLElement>,
    toColumnIndex: number,
    toIndex: number
  ): void => {
    event.preventDefault();
    const raw = event.dataTransfer.getData('application/landi-board');
    if (!raw) {
      return;
    }
    try {
      const { columnIndex, cardIndex } = JSON.parse(raw) as {
        columnIndex: number;
        cardIndex: number;
      };
      if (columnIndex === toColumnIndex) {
        moveCard(columnIndex, cardIndex, toIndex);
      } else {
        moveCardToColumn(columnIndex, cardIndex, toColumnIndex, toIndex);
      }
    } catch {
      // ignore malformed drag payload
    }
  };

  return (
    <div ref={containerRef} className={cn('relative flex h-full flex-col', className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h2 className="text-sm font-semibold">Board</h2>
        <span
          className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-400"
          data-testid="liveblocks-live-badge"
        >
          Live
        </span>
        <PresenceAvatars />
      </div>

      <CursorOverlay containerRef={containerRef} />

      <div
        className="flex min-h-0 min-w-0 flex-1 gap-3 overflow-x-auto overscroll-x-contain p-3 sm:gap-4 sm:p-4"
        data-testid="board-columns-grid"
        data-cap="CAP-019"
      >
        {(columns ?? []).map((column, columnIndex) => {
          const statusName = stateNameById.get(column.statusId) ?? column.statusId;
          const cards = column.cards ?? [];

          return (
            <section
              key={column.statusId}
              className="flex w-[240px] shrink-0 flex-col rounded-lg bg-surface-elevated/50 sm:min-w-[280px] sm:w-auto sm:flex-1"
              aria-label={`${statusName} column`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, columnIndex, cards.length)}
            >
              <header className="flex items-center justify-between border-b border-border px-3 py-2">
                <h3 className="text-sm font-medium">{statusName}</h3>
                <span className="font-mono text-xs text-muted-foreground">{cards.length}</span>
              </header>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {cards.map((cardId, cardIndex) => (
                  <div
                    key={String(cardId)}
                    draggable
                    onDragStart={(event) => handleDragStart(event, columnIndex, cardIndex)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.stopPropagation();
                      handleDrop(event, columnIndex, cardIndex);
                    }}
                  >
                    <Card
                      className={cn(
                        'cursor-grab active:cursor-grabbing',
                        selectedStoryId === cardId ? 'ring-1 ring-primary' : ''
                      )}
                      onClick={() => onCardSelect?.(String(cardId))}
                      data-testid="board-story-card"
                    >
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-sm font-medium">
                          {storyTitles[String(cardId)] ?? String(cardId)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <p className="font-mono text-[10px] text-muted-foreground">
                          Drag to reorder or change column
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
