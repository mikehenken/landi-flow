'use client';

import * as React from 'react';
import type { Epic } from '@landi-flow/core/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EpicBadge,
  cn,
} from '@landi-flow/ui';
import { useStoryStore } from '@/hooks/use-story-store';
import { brandAssets } from '@/lib/correlation';
import {
  EPIC_BOARD_COLUMNS,
  EPIC_STATUS_LABELS,
  getEpicStatusCategory,
} from '@/lib/epic-status';
import { EmptyState } from '@/components/empty-state';

export interface EpicBoardViewProps {
  epics: Epic[];
  onEpicSelect: (epicId: string) => void;
  onCreateEpic?: () => void;
  selectedEpicId?: string | null;
}

/** Kanban-style Epic board grouped by status category. */
export function EpicBoardView({
  epics,
  onEpicSelect,
  onCreateEpic,
  selectedEpicId,
}: EpicBoardViewProps): React.ReactElement {
  const { stories } = useStoryStore();

  if (epics.length === 0) {
    return (
      <EmptyState
        heading="No Epics yet"
        description="Epics are strategic containers for your team's work."
        ctaLabel="Create your first Epic"
        onCtaClick={onCreateEpic}
        imageSrc={brandAssets.emptyEpic}
        imageAlt="Empty Epic board illustration"
      />
    );
  }

  return (
    <div className="flex h-full gap-4 overflow-x-auto p-6">
      {EPIC_BOARD_COLUMNS.map((status) => {
        const columnEpics = epics.filter(
          (epic) => getEpicStatusCategory(epic) === status,
        );

        return (
          <section
            key={status}
            className="flex min-w-[300px] flex-1 flex-col rounded-lg bg-surface-elevated/50"
            aria-label={`${EPIC_STATUS_LABELS[status]} Epics`}
          >
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">
                {EPIC_STATUS_LABELS[status]}
              </h3>
              <span className="font-mono text-xs tabular-nums text-foreground-subtle">
                {columnEpics.length}
              </span>
            </header>
            <div className="flex flex-1 flex-col gap-2 p-3">
              {columnEpics.length === 0 ? (
                <p className="py-8 text-center text-xs text-foreground-subtle">
                  No Epics in {EPIC_STATUS_LABELS[status].toLowerCase()}
                </p>
              ) : (
                columnEpics.map((epic) => {
                  const storyCount = stories.filter(
                    (story) => story.epic_id === epic.id,
                  ).length;
                  const isSelected = selectedEpicId === epic.id;
                  const statusCategory = getEpicStatusCategory(epic);

                  return (
                    <button
                      key={epic.id}
                      type="button"
                      onClick={() => onEpicSelect(epic.id)}
                      className={cn(
                        'w-full rounded-lg text-left transition-colors duration-100',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        isSelected ? 'ring-1 ring-primary' : '',
                      )}
                    >
                      <Card className="cursor-pointer hover:bg-white/5">
                        <CardHeader className="space-y-2 p-3 pb-2">
                          <EpicBadge name={epic.name} status={statusCategory} />
                          <CardTitle className="text-sm font-medium leading-snug">
                            {epic.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {epic.description_md ?? 'No description'}
                          </p>
                          <p className="mt-2 font-mono text-xs tabular-nums text-foreground-subtle">
                            {storyCount} {storyCount === 1 ? 'Story' : 'Stories'}
                          </p>
                        </CardContent>
                      </Card>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
