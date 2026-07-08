'use client';

import * as React from 'react';
import type { Story, WorkflowState } from '@landi-flow/core/types';
import { storiesToBoardStorage } from '@landi-flow/collaboration';
import { Card, CardContent, CardHeader, CardTitle, cn } from '@landi-flow/ui';
import { SubStoryProgressChip } from '@/components/story-lifecycle/sub-story-progress';
import { Plus } from 'lucide-react';
import {
  updateStorySortOrder,
  updateStoryWorkflowState,
} from '@/controllers/story-controller';

type BoardColumn = { statusId: string; cards: string[] };

function applyColumnSortOrders(workspaceId: string, stories: Story[], cardIds: readonly string[]): void {
  cardIds.forEach((storyId, index) => {
    const story = stories.find((entry) => entry.id === storyId);
    if (!story) {
      return;
    }
    void updateStorySortOrder(workspaceId, story, (index + 1) * 1000);
  });
}

export interface BoardColumnsGridProps {
  workspaceId: string;
  stories: Story[];
  workflowStates: WorkflowState[];
  storyTitles: Record<string, string>;
  onCardSelect?: (storyId: string) => void;
  selectedStoryId?: string | null;
  compact?: boolean;
  className?: string;
  hiddenColumnIds?: Set<string>;
  onQuickAdd?: (workflowStateId: string) => void;
}

/** CAP-019: workflow columns with offline drag-and-drop. */
export function BoardColumnsGrid({
  workspaceId,
  stories,
  workflowStates,
  storyTitles,
  onCardSelect,
  selectedStoryId,
  compact = false,
  className,
  hiddenColumnIds,
  onQuickAdd,
}: BoardColumnsGridProps): React.ReactElement {
  const visibleStates = React.useMemo(
    () =>
      hiddenColumnIds && hiddenColumnIds.size > 0
        ? workflowStates.filter((state) => !hiddenColumnIds.has(state.id))
        : workflowStates,
    [workflowStates, hiddenColumnIds],
  );

  const columns = React.useMemo(
    () => storiesToBoardStorage(stories, visibleStates).columns as BoardColumn[],
    [stories, visibleStates],
  );

  const stateNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const state of visibleStates) {
      map.set(state.id, state.name);
    }
    return map;
  }, [visibleStates]);

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    columnIndex: number,
    cardIndex: number,
  ): void => {
    event.dataTransfer.setData(
      'application/landi-board',
      JSON.stringify({ columnIndex, cardIndex }),
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (
    event: React.DragEvent<HTMLElement>,
    toColumnIndex: number,
    toIndex: number,
  ): void => {
    event.preventDefault();
    const raw = event.dataTransfer.getData('application/landi-board');
    if (!raw) {
      return;
    }

    try {
      const { columnIndex: fromColumnIndex, cardIndex: fromCardIndex } = JSON.parse(raw) as {
        columnIndex: number;
        cardIndex: number;
      };

      const fromColumn = columns[fromColumnIndex];
      const toColumn = columns[toColumnIndex];
      if (!fromColumn || !toColumn) {
        return;
      }

      const fromCards = fromColumn.cards ?? [];
      const storyId = fromCards[fromCardIndex];
      if (!storyId) {
        return;
      }

      const nextColumns = columns.map((column) => ({
        ...column,
        cards: [...(column.cards ?? [])],
      }));
      const nextFromCards = nextColumns[fromColumnIndex]?.cards;
      const nextToCards = nextColumns[toColumnIndex]?.cards;
      if (!nextFromCards || !nextToCards) {
        return;
      }

      nextFromCards.splice(fromCardIndex, 1);
      nextToCards.splice(toIndex, 0, storyId);

      const sourceStatusId = fromColumn.statusId;
      const targetStatusId = toColumn.statusId;

      if (sourceStatusId !== targetStatusId) {
        const story = stories.find((entry) => entry.id === storyId);
        if (story) {
          void updateStoryWorkflowState(workspaceId, story, targetStatusId);
        }
        applyColumnSortOrders(workspaceId, stories, nextFromCards);
      }

      applyColumnSortOrders(workspaceId, stories, nextToCards);
    } catch {
      // ignore malformed drag payload
    }
  };

  return (
    <div
      className={cn(
        'flex min-h-0 min-w-0 flex-1 gap-3 overflow-x-auto overscroll-x-contain p-3 sm:gap-4 sm:p-4',
        className,
      )}
      data-testid="board-columns-grid"
      data-cap="CAP-019"
    >
      {columns.map((column, columnIndex) => {
        const statusName = stateNameById.get(column.statusId) ?? column.statusId;
        const cards = column.cards ?? [];

        return (
          <section
            key={column.statusId}
            className={cn(
              'flex shrink-0 flex-col rounded-lg bg-surface-elevated/50',
              compact ? 'w-[220px]' : 'w-[240px] sm:min-w-[280px] sm:w-auto sm:flex-1',
            )}
            aria-label={`${statusName} column`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, columnIndex, cards.length)}
          >
            <header className="flex items-center justify-between border-b border-border px-3 py-2">
              <h3 className="text-sm font-medium">{statusName}</h3>
              <div className="flex items-center gap-1">
                {onQuickAdd ? (
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    aria-label={`Quick-add Story to ${statusName}`}
                    data-testid={`board-column-header-quick-add-${column.statusId}`}
                    data-cap="CAP-021"
                    onClick={() => onQuickAdd(column.statusId)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <span className="font-mono text-xs text-muted-foreground">{cards.length}</span>
              </div>
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
                      selectedStoryId === cardId ? 'ring-1 ring-primary' : '',
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
                      <SubStoryProgressChip parentStoryId={String(cardId)} />
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
  );
}
