'use client';

import * as React from 'react';
import type { StoryDisplayOptions, StoryFilterAst } from '@landi-flow/core/types';
import { Button, cn, DisplayPanel, FilterPanel } from '@landi-flow/ui';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

export interface ViewOptionsDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: StoryFilterAst;
  onFiltersChange: (filters: StoryFilterAst) => void;
  display: StoryDisplayOptions;
  onDisplayChange: (display: Partial<StoryDisplayOptions>) => void;
  onLayoutChange: (layout: 'list' | 'board') => void;
  statusOptions: Array<{ value: string; label: string }>;
  assigneeOptions: Array<{ value: string; label: string }>;
  customerOptions: Array<{ value: string; label: string }>;
  filterLabels: Record<string, string>;
  displayLabels: Record<string, string>;
}

/** IDEA-001 — unified View options drawer with progressive disclosure. */
export function ViewOptionsDrawer({
  open,
  onClose,
  filters,
  onFiltersChange,
  display,
  onDisplayChange,
  onLayoutChange,
  statusOptions,
  assigneeOptions,
  customerOptions,
  filterLabels,
  displayLabels,
}: ViewOptionsDrawerProps): React.ReactElement | null {
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [displayOpen, setDisplayOpen] = React.useState(false);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      data-testid="view-options-drawer"
      role="dialog"
      aria-label="View options"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-xl"
        data-testid="progressive-disclosure-shell"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">View options</h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <section data-testid="view-options-defaults">
            <p className="text-xs text-muted-foreground mb-2">
              Defaults: List layout, Status grouping, ID + Status + Assignee + Priority visible.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={display.layout === 'list' ? 'default' : 'secondary'}
                onClick={() => onLayoutChange('list')}
                data-testid="view-options-layout-list"
              >
                {displayLabels.list ?? 'List'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={display.layout === 'board' ? 'default' : 'secondary'}
                onClick={() => onLayoutChange('board')}
                data-testid="view-options-layout-board"
              >
                {displayLabels.board ?? 'Board'}
              </Button>
            </div>
          </section>

          <section>
            <button
              type="button"
              className="flex w-full items-center gap-2 text-left text-sm font-medium"
              onClick={() => setAdvancedOpen((value) => !value)}
              data-testid="view-options-advanced-toggle"
            >
              {advancedOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Advanced view options
            </button>

            {advancedOpen ? (
              <div
                className={cn('mt-3 space-y-2 rounded-md border border-border p-3')}
                data-testid="view-options-advanced-panel"
              >
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => {
                    setFilterOpen(true);
                    setDisplayOpen(false);
                  }}
                  data-testid="view-options-open-filter"
                >
                  {filterLabels.title ?? 'Filter'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => {
                    setDisplayOpen(true);
                    setFilterOpen(false);
                  }}
                  data-testid="view-options-open-display"
                >
                  {displayLabels.title ?? 'Display'}
                </Button>
              </div>
            ) : null}
          </section>
        </div>

        <FilterPanel
          open={filterOpen}
          filters={filters}
          onChange={onFiltersChange}
          onClose={() => setFilterOpen(false)}
          statusOptions={statusOptions}
          assigneeOptions={assigneeOptions}
          customerOptions={customerOptions}
          labels={filterLabels}
        />

        <DisplayPanel
          open={displayOpen}
          display={display}
          onChange={onDisplayChange}
          onLayoutChange={onLayoutChange}
          onClose={() => setDisplayOpen(false)}
          labels={displayLabels}
        />
      </div>
    </div>
  );
}
