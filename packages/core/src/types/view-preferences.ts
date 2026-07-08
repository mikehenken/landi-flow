import type { StoryPriority, ViewLayout } from './index.js';

/** Filter operators supported by the standard filter builder (CAP-027). */
export type StoryFilterOperator = 'is' | 'is_not' | 'contains';

/** Filterable dimensions on the Stories view. */
export type StoryFilterField =
  | 'status'
  | 'assignee'
  | 'priority'
  | 'customer'
  | 'search';

export interface StoryFilterCondition {
  id: string;
  field: StoryFilterField;
  operator: StoryFilterOperator;
  values: string[];
}

export interface StoryFilterAst {
  op: 'and';
  conditions: StoryFilterCondition[];
}

/** Display property chips toggled in the display panel (CAP-024). */
export type StoryDisplayProperty =
  | 'id'
  | 'status'
  | 'assignee'
  | 'priority'
  | 'customer';

export type StoryViewOrdering = 'manual' | 'priority' | 'updated';

/** Per-user display options persisted locally (CAP-022–026). */
export interface StoryDisplayOptions {
  layout: ViewLayout;
  ordering: StoryViewOrdering;
  orderCompletedByRecency: boolean;
  showSubStories: boolean;
  displayProperties: StoryDisplayProperty[];
}

export interface StoryViewPreferences {
  filters: StoryFilterAst;
  display: StoryDisplayOptions;
  searchQuery: string;
}

export const DEFAULT_STORY_DISPLAY_PROPERTIES: StoryDisplayProperty[] = [
  'id',
  'status',
  'assignee',
  'priority',
];

export const DEFAULT_STORY_DISPLAY_OPTIONS: StoryDisplayOptions = {
  layout: 'list',
  ordering: 'manual',
  orderCompletedByRecency: false,
  showSubStories: true,
  displayProperties: [...DEFAULT_STORY_DISPLAY_PROPERTIES],
};

export const DEFAULT_STORY_VIEW_PREFERENCES: StoryViewPreferences = {
  filters: { op: 'and', conditions: [] },
  display: DEFAULT_STORY_DISPLAY_OPTIONS,
  searchQuery: '',
};

export const STORY_PRIORITY_VALUES: StoryPriority[] = [
  'none',
  'low',
  'medium',
  'high',
  'urgent',
];
