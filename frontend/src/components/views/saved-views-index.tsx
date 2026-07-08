'use client';

import * as React from 'react';
import type { View } from '@landi-flow/core/types';
import { Button, cn } from '@landi-flow/ui';
import { Link } from '@/i18n/navigation';
import {
  createSavedView,
  listSavedViews,
  toggleViewSharing,
} from '@/lib/views/saved-views-store';
import { useWorkspace } from '@/lib/workspace';

export interface SavedViewsIndexProps {
  className?: string;
}

/** CAP-029/030: saved views index with sharing toggle. */
export function SavedViewsIndex({ className }: SavedViewsIndexProps): React.ReactElement {
  const { workspace } = useWorkspace();
  const [views, setViews] = React.useState<View[]>(() => listSavedViews(workspace.id));

  const refresh = React.useCallback((): void => {
    setViews(listSavedViews(workspace.id));
  }, [workspace.id]);

  const handleCreate = (): void => {
    createSavedView(
      {
        name: 'New saved view',
        scope: 'personal',
        layout: 'list',
        team_id: null,
        is_shared: false,
      },
      workspace.id,
    );
    refresh();
  };

  const handleToggleShare = (viewId: string, current: boolean): void => {
    toggleViewSharing(viewId, !current);
    refresh();
  };

  return (
    <section
      className={cn('flex flex-col gap-4 p-6', className)}
      data-testid="saved-views-index"
      data-cap="CAP-029"
    >
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Saved views</h2>
          <p className="text-sm text-muted-foreground">
            Personal and shared views for list and board layouts.
          </p>
        </div>
        <Button type="button" size="sm" data-testid="saved-view-create" onClick={handleCreate}>
          Create view
        </Button>
      </header>

      <ul className="flex flex-col gap-2" data-testid="saved-views-list">
        {views.map((view) => (
          <li
            key={view.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3"
            data-testid="saved-view-row"
          >
            <div className="min-w-0">
              <p className="font-medium">{view.name}</p>
              <p className="text-xs text-muted-foreground">
                {view.scope} · {view.layout}
                {view.is_shared ? ' · shared' : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid="saved-view-share-toggle"
                data-cap="CAP-030"
                onClick={() => handleToggleShare(view.id, view.is_shared)}
              >
                {view.is_shared ? 'Unshare' : 'Share'}
              </Button>
              <Link
                href={
                  view.layout === 'board'
                    ? '/workspace/stories/board'
                    : '/workspace/stories'
                }
                className="text-sm text-primary hover:underline"
              >
                Open
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
