import type { Story } from '@landi-flow/core/types';
import type {
  StoryDisplayOptions,
  StoryFilterAst,
  StoryFilterCondition,
} from '@landi-flow/core/types';
import { workflowStateToStatus } from '@/lib/workflow-states';
import {
  getParentStoryId,
  getStoryCustomerId,
  getSubStoryIds,
} from '@/lib/story-relations-seed';

function matchesCondition(story: Story, condition: StoryFilterCondition): boolean {
  const { field, operator, values } = condition;
  if (values.length === 0) {
    return true;
  }

  let actual: string | null = null;
  switch (field) {
    case 'status':
      actual = workflowStateToStatus(story.workflow_state_id);
      break;
    case 'assignee':
      actual = story.assignee_id ?? story.delegate_agent_id ?? '__unassigned__';
      break;
    case 'priority':
      actual = story.priority;
      break;
    case 'customer':
      actual = getStoryCustomerId(story.id) ?? '__none__';
      break;
    case 'search':
      actual = `${story.identifier} ${story.title}`.toLowerCase();
      break;
    default:
      return true;
  }

  if (field === 'search') {
    const query = values[0]?.toLowerCase() ?? '';
    if (!query) {
      return true;
    }
    return operator === 'contains' ? actual.includes(query) : actual === query;
  }

  const isMatch = values.includes(actual);
  return operator === 'is_not' ? !isMatch : isMatch;
}

export function applyStoryFilters(stories: Story[], filterAst: StoryFilterAst): Story[] {
  if (filterAst.conditions.length === 0) {
    return stories;
  }

  return stories.filter((story) =>
    filterAst.conditions.every((condition) => matchesCondition(story, condition)),
  );
}

export function applyStorySearch(stories: Story[], searchQuery: string): Story[] {
  const normalized = searchQuery.trim().toLowerCase();
  if (!normalized) {
    return stories;
  }

  return stories.filter((story) => {
    const haystack = `${story.identifier} ${story.title}`.toLowerCase();
    return haystack.includes(normalized);
  });
}

function comparePriority(a: Story, b: Story): number {
  const order: Record<Story['priority'], number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
    none: 4,
  };
  return order[a.priority] - order[b.priority];
}

export function sortStoriesForView(stories: Story[], display: StoryDisplayOptions): Story[] {
  const sorted = [...stories];

  if (display.ordering === 'priority') {
    sorted.sort((a, b) => comparePriority(a, b) || a.sort_order - b.sort_order);
    return sorted;
  }

  if (display.ordering === 'updated') {
    sorted.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
    return sorted;
  }

  sorted.sort((a, b) => a.sort_order - b.sort_order);

  if (display.orderCompletedByRecency) {
    const completed = sorted.filter(
      (story) => workflowStateToStatus(story.workflow_state_id) === 'done',
    );
    const active = sorted.filter(
      (story) => workflowStateToStatus(story.workflow_state_id) !== 'done',
    );
    completed.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
    return [...active, ...completed];
  }

  return sorted;
}

export function flattenStoriesWithSubStories(
  stories: Story[],
  showSubStories: boolean,
): Story[] {
  if (showSubStories) {
    return stories;
  }

  return stories.filter((story) => getParentStoryId(story.id) === null);
}

export function processStoriesForView(
  stories: Story[],
  filters: StoryFilterAst,
  searchQuery: string,
  display: StoryDisplayOptions,
  options?: { includeDrafts?: boolean },
): Story[] {
  let result = options?.includeDrafts ? stories : stories.filter((story) => !story.is_draft);
  result = applyStoryFilters(result, filters);
  result = applyStorySearch(result, searchQuery);
  result = flattenStoriesWithSubStories(result, display.showSubStories);
  return sortStoriesForView(result, display);
}

export function getVisibleSubStoryCount(parentStoryId: string, allStories: Story[]): number {
  const childIds = getSubStoryIds(parentStoryId);
  return childIds.filter((childId) => allStories.some((story) => story.id === childId)).length;
}
