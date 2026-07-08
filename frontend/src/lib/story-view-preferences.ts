import {
  DEFAULT_STORY_VIEW_PREFERENCES,
  type StoryDisplayOptions,
  type StoryFilterAst,
  type StoryFilterCondition,
  type StoryFilterField,
  type StoryFilterOperator,
  type StoryViewPreferences,
} from '@landi-flow/core/types';

export const STORY_VIEW_PREFERENCES_STORAGE_KEY = 'landi-flow:story-view-preferences';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseDisplayOptions(raw: unknown): StoryDisplayOptions {
  if (!isRecord(raw)) {
    return DEFAULT_STORY_VIEW_PREFERENCES.display;
  }

  const base = DEFAULT_STORY_VIEW_PREFERENCES.display;
  const layout = raw.layout === 'board' ? 'board' : 'list';
  const ordering =
    raw.ordering === 'priority' || raw.ordering === 'updated' ? raw.ordering : 'manual';

  const displayProperties = Array.isArray(raw.displayProperties)
    ? raw.displayProperties.filter((entry): entry is StoryDisplayOptions['displayProperties'][number] =>
        typeof entry === 'string',
      )
    : base.displayProperties;

  return {
    layout,
    ordering,
    orderCompletedByRecency: raw.orderCompletedByRecency === true,
    showSubStories: raw.showSubStories !== false,
    displayProperties:
      displayProperties.length > 0 ? displayProperties : base.displayProperties,
  };
}

function parseFilterAst(raw: unknown): StoryFilterAst {
  if (!isRecord(raw) || !Array.isArray(raw.conditions)) {
    return DEFAULT_STORY_VIEW_PREFERENCES.filters;
  }

  const conditions: StoryFilterCondition[] = raw.conditions
    .filter(isRecord)
    .map((condition) => {
      const fieldRaw = condition.field;
      const field: StoryFilterField =
        fieldRaw === 'status' ||
        fieldRaw === 'assignee' ||
        fieldRaw === 'priority' ||
        fieldRaw === 'customer' ||
        fieldRaw === 'search'
          ? fieldRaw
          : 'status';
      const operatorRaw = condition.operator;
      const operator: StoryFilterOperator =
        operatorRaw === 'is_not' || operatorRaw === 'contains' ? operatorRaw : 'is';
      return {
        id: typeof condition.id === 'string' ? condition.id : crypto.randomUUID(),
        field,
        operator,
        values: Array.isArray(condition.values)
          ? condition.values.filter((value): value is string => typeof value === 'string')
          : [],
      };
    })
    .filter((condition) => condition.values.length > 0);

  return { op: 'and', conditions };
}

export function readStoryViewPreferences(): StoryViewPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_STORY_VIEW_PREFERENCES;
  }

  try {
    const stored = window.localStorage.getItem(STORY_VIEW_PREFERENCES_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_STORY_VIEW_PREFERENCES;
    }

    const parsed: unknown = JSON.parse(stored);
    if (!isRecord(parsed)) {
      return DEFAULT_STORY_VIEW_PREFERENCES;
    }

    return {
      filters: parseFilterAst(parsed.filters),
      display: parseDisplayOptions(parsed.display),
      searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery : '',
    };
  } catch {
    return DEFAULT_STORY_VIEW_PREFERENCES;
  }
}

export function writeStoryViewPreferences(preferences: StoryViewPreferences): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      STORY_VIEW_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences),
    );
  } catch {
    // Ignore quota / privacy errors
  }
}
