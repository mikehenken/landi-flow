'use client';

import * as React from 'react';
import type { Story, WorkflowState } from '@landi-flow/core/types';
import { LiveList, LiveObject } from '@liveblocks/client';
import type { JsonObject } from '@liveblocks/client';
import { hydrateBoardRoom } from '@landi-flow/collaboration';
import { useMutation, useStorage } from '@liveblocks/react/suspense';
import { Card, CardContent, CardHeader, CardTitle, cn } from '@landi-flow/ui';
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
  className?: string;
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
  className,
}: CollaborativeBoardProps): React.ReactElement {
  const hydrated = React.useMemo(
    () => hydrateBoardRoom(workspaceId, teamId, stories, workflowStates),
    [workspaceId, teamId, stories, workflowStates]
  );

  return (
    <CollaborativeRoom
      roomId={hydrated.roomId}
      initialStorage={hydrated.initialStorage as unknown as JsonObject}
    >
      <BoardInner
        workflowStates={workflowStates}
        storyTitles={storyTitles}
        onCardSelect={onCardSelect}
        selectedStoryId={selectedStoryId}
        className={className}
      />
    </CollaborativeRoom>
  );
}

interface BoardInnerProps {
  workflowStates: WorkflowState[];
  storyTitles: Record<string, string>;
  onCardSelect?: (storyId: string) => void;
  selectedStoryId?: string | null;
  className?: string;
}

function BoardInner({
  workflowStates,
  storyTitles,
  onCardSelect,
  selectedStoryId,
  className,
}: BoardInnerProps): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const columns = useStorage((root) => {
    const raw = root.columns;
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw as Array<{ statusId: string; cards: string[] }>;
  });

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
        <h2 className="text-sm font-semibold">Live Board</h2>
        <PresenceAvatars />
      </div>

      <CursorOverlay containerRef={containerRef} />

      <div className="flex flex-1 gap-4 overflow-x-auto p-4">
        {(columns ?? []).map((column, columnIndex) => {
          const statusName = stateNameById.get(column.statusId) ?? column.statusId;
          const cards = column.cards ?? [];

          return (
            <section
              key={column.statusId}
              className="flex min-w-[280px] flex-1 flex-col rounded-lg bg-surface-elevated/50"
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
