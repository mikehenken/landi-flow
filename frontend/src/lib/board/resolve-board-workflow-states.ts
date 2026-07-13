import type { Story, WorkflowState } from '@landi-flow/core/types';

/**
 * Pick workflow columns that can actually host the given stories.
 * Never invents demo `state-*` ids — those will not match production UUID statuses.
 */
export function resolveBoardWorkflowStates(
  stories: Story[],
  workflowStates: WorkflowState[],
): WorkflowState[] {
  if (stories.length === 0 && workflowStates.length > 0) {
    return [...workflowStates].sort((a, b) => a.position - b.position);
  }

  const storyStateIds = new Set(
    stories.map((story) => story.workflow_state_id).filter((id): id is string => Boolean(id)),
  );

  if (workflowStates.length > 0 && storyStateIds.size > 0) {
    const rosterIds = new Set(workflowStates.map((state) => state.id));
    const rosterCoversAllStories = [...storyStateIds].every((id) => rosterIds.has(id));
    if (rosterCoversAllStories) {
      return [...workflowStates].sort((a, b) => a.position - b.position);
    }
  }

  const nameById = new Map(workflowStates.map((state) => [state.id, state.name]));
  const synthesized = synthesizeWorkflowStatesFromStories(stories);
  return synthesized.map((state) => ({
    ...state,
    name: nameById.get(state.id) ?? state.name,
  }));
}

/** Build minimal columns from distinct story.workflow_state_id values when roster is missing. */
export function synthesizeWorkflowStatesFromStories(stories: Story[]): WorkflowState[] {
  const seen = new Map<string, WorkflowState>();
  for (const story of stories) {
    const stateId = story.workflow_state_id;
    if (!stateId || seen.has(stateId)) {
      continue;
    }
    seen.set(stateId, {
      id: stateId,
      team_id: story.team_id,
      name: `State ${seen.size + 1}`,
      category: 'unstarted',
      position: seen.size,
      is_default: seen.size === 0,
    });
  }
  return [...seen.values()];
}

/** Prefer the team that owns visible stories over a stale demo/default team id. */
export function resolveBoardTeamId(
  stories: Story[],
  defaultTeamId: string | null,
): string | null {
  if (defaultTeamId) {
    const matchesDefault = stories.some((story) => story.team_id === defaultTeamId);
    if (matchesDefault || stories.length === 0) {
      return defaultTeamId;
    }
  }

  const counts = new Map<string, number>();
  for (const story of stories) {
    if (!story.team_id) {
      continue;
    }
    counts.set(story.team_id, (counts.get(story.team_id) ?? 0) + 1);
  }

  let bestTeamId: string | null = null;
  let bestCount = 0;
  for (const [teamId, count] of counts) {
    if (count > bestCount) {
      bestTeamId = teamId;
      bestCount = count;
    }
  }
  return bestTeamId ?? defaultTeamId;
}
