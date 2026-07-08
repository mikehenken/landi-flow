'use client';

import * as React from 'react';
import type { Story, StoryDisplayProperty, ViewLayout } from '@landi-flow/core/types';
import {
  BulkActionBar,
  DisplayPanel,
  FilterPanel,
  Input,
  cn,
  useTranslations,
} from '@landi-flow/ui';
import { Filter, LayoutGrid, SlidersHorizontal } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { ViewOptionsDrawer } from '@/components/views/view-options-drawer';
import { useStoryViewPreferences } from '@/hooks/use-story-view-preferences';
import { useStorySelection } from '@/hooks/use-story-selection';
import { processStoriesForView } from '@/lib/story-view-pipeline';
import { workflowStateToStatus } from '@/lib/workflow-states';
import { SEED_CUSTOMERS } from '@/lib/seed-data';
import { useWorkspace } from '@/lib/workspace';
import {
  bulkDeleteStories,
  bulkUpdateStoryPriority,
  bulkUpdateStoryWorkflowState,
} from '@/controllers/story-bulk-controller';
import { storySelectionStore } from '@/stores/story-selection-store';
import { useStoriesViewShortcuts } from '@/hooks/use-stories-view-shortcuts';

export interface StoriesViewProviderProps {
  stories: Story[];
  layout: ViewLayout;
  children: React.ReactNode;
}

interface StoriesViewContextValue {
  visibleStories: Story[];
  layout: ViewLayout;
  displayProperties: StoryDisplayProperty[];
  openFilterPanel: () => void;
  openDisplayPanel: () => void;
  toggleLayout: () => void;
}

const StoriesViewContext = React.createContext<StoriesViewContextValue | null>(null);

export function useStoriesViewContext(): StoriesViewContextValue {
  const context = React.useContext(StoriesViewContext);
  if (!context) {
    throw new Error('useStoriesViewContext must be used within StoriesViewProvider');
  }
  return context;
}

/** Shared filter/display/search/bulk state for Stories list + board routes (task-09s). */
export function StoriesViewProvider({
  stories,
  layout,
  children,
}: StoriesViewProviderProps): React.ReactElement {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const t = useTranslations('views');
  const { preferences, setFilters, patchDisplay, setSearchQuery } = useStoryViewPreferences();
  const { selectedIds, clear: clearSelection } = useStorySelection();

  const [filterOpen, setFilterOpen] = React.useState(false);
  const [displayOpen, setDisplayOpen] = React.useState(false);
  const [viewOptionsOpen, setViewOptionsOpen] = React.useState(false);

  const visibleStories = React.useMemo(
    () =>
      processStoriesForView(
        stories,
        preferences.filters,
        preferences.searchQuery,
        preferences.display,
      ),
    [stories, preferences.filters, preferences.searchQuery, preferences.display],
  );

  const navigateLayout = React.useCallback(
    (nextLayout: ViewLayout) => {
      patchDisplay({ layout: nextLayout });
      router.push(nextLayout === 'board' ? '/workspace/stories/board' : '/workspace/stories');
    },
    [patchDisplay, router],
  );

  const toggleLayout = React.useCallback(() => {
    navigateLayout(layout === 'list' ? 'board' : 'list');
  }, [layout, navigateLayout]);

  const selectedStories = React.useMemo(
    () => stories.filter((story) => selectedIds.includes(story.id)),
    [stories, selectedIds],
  );

  const statusOptions = React.useMemo(
    () =>
      Array.from(new Set(stories.map((story) => workflowStateToStatus(story.workflow_state_id)))).map(
        (status) => ({ value: status, label: status.replace('_', ' ') }),
      ),
    [stories],
  );

  const assigneeOptions = React.useMemo(() => {
    const ids = new Set<string>();
    for (const story of stories) {
      if (story.assignee_id) {
        ids.add(story.assignee_id);
      }
      if (story.delegate_agent_id) {
        ids.add(story.delegate_agent_id);
      }
    }
    return [...ids].map((id) => ({ value: id, label: id }));
  }, [stories]);

  const customerOptions = React.useMemo(
    () => SEED_CUSTOMERS.map((customer) => ({ value: customer.id, label: customer.name })),
    [],
  );

  const workflowStateOptions = React.useMemo(
    () =>
      Array.from(new Set(stories.map((story) => story.workflow_state_id))).map((stateId) => ({
        value: stateId,
        label: workflowStateToStatus(stateId).replace('_', ' '),
      })),
    [stories],
  );

  const contextValue = React.useMemo<StoriesViewContextValue>(
    () => ({
      visibleStories,
      layout,
      displayProperties: preferences.display.displayProperties,
      openFilterPanel: () => setFilterOpen(true),
      openDisplayPanel: () => setDisplayOpen(true),
      toggleLayout,
    }),
    [visibleStories, layout, preferences.display.displayProperties, toggleLayout],
  );

  useStoriesViewShortcuts({
    enabled: true,
    orderedStoryIds: visibleStories.map((story) => story.id),
    onToggleLayout: toggleLayout,
    onOpenFilter: () => setFilterOpen(true),
    onOpenDisplay: () => setDisplayOpen(true),
    focusedStoryId: selectedIds[selectedIds.length - 1] ?? null,
  });

  return (
    <StoriesViewContext.Provider value={contextValue}>
      <StoriesViewToolbar
        searchQuery={preferences.searchQuery}
        onSearchChange={setSearchQuery}
        onOpenFilter={() => setFilterOpen(true)}
        onOpenDisplay={() => setDisplayOpen(true)}
        onOpenViewOptions={() => setViewOptionsOpen(true)}
      />

      {children}

      <FilterPanel
        open={filterOpen}
        filters={preferences.filters}
        onChange={setFilters}
        onClose={() => setFilterOpen(false)}
        statusOptions={statusOptions}
        assigneeOptions={assigneeOptions}
        customerOptions={customerOptions}
        labels={{
          title: t('filter.title'),
          addFilter: t('filter.add_filter'),
          clearAll: t('filter.clear_all'),
          apply: t('filter.apply'),
          status: t('filter.status'),
          assignee: t('filter.assignee'),
          priority: t('filter.priority'),
          customer: t('filter.customer'),
          is: t('filter.is'),
          isNot: t('filter.is_not'),
          unassigned: t('filter.unassigned'),
          noCustomer: t('filter.no_customer'),
        }}
      />

      <DisplayPanel
        open={displayOpen}
        display={preferences.display}
        onChange={(display) => patchDisplay(display)}
        onLayoutChange={navigateLayout}
        onClose={() => setDisplayOpen(false)}
        labels={{
          title: t('display.title'),
          layout: t('display.layout'),
          list: t('display.list'),
          board: t('display.board'),
          ordering: t('display.ordering'),
          orderingManual: t('display.ordering_manual'),
          orderingPriority: t('display.ordering_priority'),
          orderingUpdated: t('display.ordering_updated'),
          orderCompletedByRecency: t('display.order_completed_by_recency'),
          showSubStories: t('display.show_sub_stories'),
          displayProperties: t('display.display_properties'),
          propertyId: t('display.property_id'),
          propertyStatus: t('display.property_status'),
          propertyAssignee: t('display.property_assignee'),
          propertyPriority: t('display.property_priority'),
          propertyCustomer: t('display.property_customer'),
        }}
      />

      <BulkActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => storySelectionStore.clear()}
        statusOptions={workflowStateOptions}
        labels={{
          selected: t('bulk.selected'),
          clearSelection: t('bulk.clear_selection'),
          setStatus: t('bulk.set_status'),
          setPriority: t('bulk.set_priority'),
          delete: t('bulk.delete'),
        }}
        onBulkStatus={(workflowStateId) => {
          void bulkUpdateStoryWorkflowState(workspace.id, selectedStories, workflowStateId).finally(
            () => clearSelection(),
          );
        }}
        onBulkPriority={(priority) => {
          void bulkUpdateStoryPriority(workspace.id, selectedStories, priority).finally(() =>
            clearSelection(),
          );
        }}
        onBulkDelete={() => {
          void bulkDeleteStories(workspace.id, selectedStories).finally(() => clearSelection());
        }}
      />

      <ViewOptionsDrawer
        open={viewOptionsOpen}
        onClose={() => setViewOptionsOpen(false)}
        filters={preferences.filters}
        onFiltersChange={setFilters}
        display={preferences.display}
        onDisplayChange={(display) => patchDisplay(display)}
        onLayoutChange={navigateLayout}
        statusOptions={statusOptions}
        assigneeOptions={assigneeOptions}
        customerOptions={customerOptions}
        filterLabels={{
          title: t('filter.title'),
          addFilter: t('filter.add_filter'),
          clearAll: t('filter.clear_all'),
          apply: t('filter.apply'),
          status: t('filter.status'),
          assignee: t('filter.assignee'),
          priority: t('filter.priority'),
          customer: t('filter.customer'),
          is: t('filter.is'),
          isNot: t('filter.is_not'),
          unassigned: t('filter.unassigned'),
          noCustomer: t('filter.no_customer'),
        }}
        displayLabels={{
          title: t('display.title'),
          layout: t('display.layout'),
          list: t('display.list'),
          board: t('display.board'),
          ordering: t('display.ordering'),
          orderingManual: t('display.ordering_manual'),
          orderingPriority: t('display.ordering_priority'),
          orderingUpdated: t('display.ordering_updated'),
          orderCompletedByRecency: t('display.order_completed_by_recency'),
          showSubStories: t('display.show_sub_stories'),
          displayProperties: t('display.display_properties'),
          propertyId: t('display.property_id'),
          propertyStatus: t('display.property_status'),
          propertyAssignee: t('display.property_assignee'),
          propertyPriority: t('display.property_priority'),
          propertyCustomer: t('display.property_customer'),
        }}
      />
    </StoriesViewContext.Provider>
  );
}

interface StoriesViewToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenFilter: () => void;
  onOpenDisplay: () => void;
  onOpenViewOptions: () => void;
}

function StoriesViewToolbar({
  searchQuery,
  onSearchChange,
  onOpenFilter,
  onOpenDisplay,
  onOpenViewOptions,
}: StoriesViewToolbarProps): React.ReactElement {
  const t = useTranslations('views');

  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 sm:px-6"
      data-testid="stories-view-toolbar"
    >
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('toolbar.search_placeholder')}
          aria-label={t('toolbar.search_placeholder')}
          data-testid="stories-view-search"
          className="h-8"
        />
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenFilter}
          className={cn(
            'inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground',
          )}
          data-testid="stories-view-filter-trigger"
          aria-label={t('toolbar.filter')}
        >
          <Filter className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('toolbar.filter')}</span>
        </button>
        <button
          type="button"
          onClick={onOpenViewOptions}
          className={cn(
            'inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground',
          )}
          data-testid="view-options-trigger"
          aria-label="View options"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">View</span>
        </button>
        <button
          type="button"
          onClick={onOpenDisplay}
          className={cn(
            'inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground',
          )}
          data-testid="stories-view-display-trigger"
          aria-label={t('toolbar.display')}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('toolbar.display')}</span>
        </button>
        <button
          type="button"
          onClick={onOpenDisplay}
          className={cn(
            'inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground',
          )}
          data-testid="stories-view-layout-trigger"
          aria-label={t('toolbar.layout_board')}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export { StoriesViewToolbar };
