import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import type { StoryFilterAst } from '@landi-flow/core/types';
import { DEFAULT_STORY_DISPLAY_OPTIONS } from '@landi-flow/core/types';
import { FilterPanel, DisplayPanel, BulkActionBar } from './index';

const filterLabels = {
  title: 'Filters',
  addFilter: 'Add filter',
  clearAll: 'Clear all',
  apply: 'Apply',
  status: 'Status',
  assignee: 'Assignee',
  priority: 'Priority',
  customer: 'Customer',
  is: 'is',
  isNot: 'is not',
  unassigned: 'Unassigned',
  noCustomer: 'No customer',
};

const displayLabels = {
  title: 'Display',
  layout: 'Layout',
  list: 'List',
  board: 'Board',
  ordering: 'Ordering',
  orderingManual: 'Manual',
  orderingPriority: 'Priority',
  orderingUpdated: 'Updated',
  orderCompletedByRecency: 'Order completed by recency',
  showSubStories: 'Show sub-stories',
  displayProperties: 'Display properties',
  propertyId: 'ID',
  propertyStatus: 'Status',
  propertyAssignee: 'Assignee',
  propertyPriority: 'Priority',
  propertyCustomer: 'Customer',
};

const bulkLabels = {
  selected: 'selected',
  clearSelection: 'Clear',
  setStatus: 'Set status',
  setPriority: 'Set priority',
  delete: 'Delete',
};

const meta: Meta = {
  title: 'Views/Overlays',
};

export default meta;

export const FilterPanelStory: StoryObj = {
  render: () => {
    const [filters, setFilters] = React.useState<StoryFilterAst>({ op: 'and', conditions: [] });
    return (
      <FilterPanel
        open
        filters={filters}
        onChange={setFilters}
        onClose={() => undefined}
        statusOptions={[
          { value: 'todo', label: 'Todo' },
          { value: 'done', label: 'Done' },
        ]}
        assigneeOptions={[{ value: 'user-jane', label: 'Jane' }]}
        customerOptions={[{ value: 'customer-acme', label: 'Acme Corp' }]}
        labels={filterLabels}
      />
    );
  },
};

export const DisplayPanelStory: StoryObj = {
  render: () => (
    <DisplayPanel
      open
      display={DEFAULT_STORY_DISPLAY_OPTIONS}
      onChange={() => undefined}
      onClose={() => undefined}
      labels={displayLabels}
    />
  ),
};

export const BulkActionBarStory: StoryObj = {
  render: () => (
    <BulkActionBar
      selectedCount={3}
      onClearSelection={() => undefined}
      onBulkStatus={() => undefined}
      onBulkPriority={() => undefined}
      onBulkDelete={() => undefined}
      statusOptions={[{ value: 'state-todo', label: 'Todo' }]}
      labels={bulkLabels}
    />
  ),
};
