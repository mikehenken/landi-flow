'use client';

import * as React from 'react';
import type { Epic, EpicStatusCategory } from '@landi-flow/core/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EpicBadge,
  cn,
  useTranslations,
} from '@landi-flow/ui';
import { useStoryStore } from '@/hooks/use-story-store';
import { brandAssets } from '@/lib/correlation';
import {
  EPIC_BOARD_COLUMNS,
  getEpicStatusCategory,
} from '@/lib/epic-status';
import { EmptyState } from '@/components/empty-state';

export interface EpicBoardViewProps {
  epics: Epic[];
  onEpicSelect: (epicId: string) => void;
  onCreateEpic?: () => void;
  selectedEpicId?: string | null;
}

const STATUS_I18N_KEYS: Record<EpicStatusCategory, `status.${EpicStatusCategory}`> = {
  backlog: 'status.backlog',
  planned: 'status.planned',
  in_progress: 'status.in_progress',
  completed: 'status.completed',
  cancelled: 'status.cancelled',
};

/** Kanban-style Epic board grouped by status category with i18n labels. */
export function EpicBoardView({
  epics,
  onEpicSelect,
  onCreateEpic,
  selectedEpicId,
}: EpicBoardViewProps): React.ReactElement {
  const { stories } = useStoryStore();
  const t = useTranslations('epics');
  const tStories = useTranslations('stories');

  if (epics.length === 0) {
    return (
      <EmptyState
        heading={t('empty.heading')}
        description={t('empty.description')}
        ctaLabel={t('empty.cta')}
        onCtaClick={onCreateEpic}
        imageSrc={brandAssets.emptyEpic}
        imageAlt={t('badge.label')}
      />
    );
  }

  return (
    <div className="flex h-full gap-4 overflow-x-auto p-6">
      {EPIC_BOARD_COLUMNS.map((status) => {
        const columnEpics = epics.filter(
          (epic) => getEpicStatusCategory(epic) === status,
        );
        const statusLabel = t(STATUS_I18N_KEYS[status]);

        return (
          <section
            key={status}
            className="flex min-w-[300px] flex-1 flex-col rounded-lg bg-surface-elevated/50"
            aria-label={`${statusLabel} ${t('badge.label')}`}
          >
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                {statusLabel}
              </h3>
              <span className="font-mono text-xs tabular-nums text-foreground-subtle">
                {columnEpics.length}
              </span>
            </header>
            <div className="flex flex-1 flex-col gap-2 p-3">
              {columnEpics.length === 0 ? (
                <p className="py-8 text-center text-xs text-foreground-subtle">
                  {t('empty.heading')}
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
                      data-testid="epic-board-item"
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
                          <CardTitle className="line-clamp-2 text-sm font-medium leading-snug">
                            {epic.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {epic.description_md ?? '—'}
                          </p>
                          <p className="mt-2 font-mono text-xs tabular-nums text-foreground-subtle">
                            {storyCount} {tStories('badge.label')}
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
