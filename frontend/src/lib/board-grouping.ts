import type { Cycle, Epic, Story } from '@landi-flow/core/types';
import type { BoardGroupBy } from '@/lib/board-swimlane-preference';

export interface BoardSwimlane {
  id: string;
  label: string;
  stories: Story[];
}

const UNASSIGNED_EPIC_ID = '__no_epic__';
const UNASSIGNED_CYCLE_ID = '__no_cycle__';

export function buildBoardSwimlanes(
  stories: Story[],
  groupBy: BoardGroupBy,
  epics: Epic[],
  cycles: Cycle[],
): BoardSwimlane[] {
  if (groupBy === 'none') {
    return [{ id: 'all', label: 'All stories', stories }];
  }

  if (groupBy === 'epic') {
    const buckets = new Map<string, Story[]>();

    for (const story of stories) {
      const laneId = story.epic_id ?? UNASSIGNED_EPIC_ID;
      const existing = buckets.get(laneId) ?? [];
      existing.push(story);
      buckets.set(laneId, existing);
    }

    const lanes: BoardSwimlane[] = [];

    for (const epic of epics) {
      const laneStories = buckets.get(epic.id);
      if (laneStories && laneStories.length > 0) {
        lanes.push({
          id: epic.id,
          label: epic.name,
          stories: laneStories,
        });
        buckets.delete(epic.id);
      }
    }

    const unassigned = buckets.get(UNASSIGNED_EPIC_ID);
    if (unassigned && unassigned.length > 0) {
      lanes.push({
        id: UNASSIGNED_EPIC_ID,
        label: 'No Epic',
        stories: unassigned,
      });
    }

    return lanes;
  }

  const cycleNameById = new Map(cycles.map((cycle) => [cycle.id, cycle.name]));
  const buckets = new Map<string, Story[]>();

  for (const story of stories) {
    const laneId = story.cycle_id ?? UNASSIGNED_CYCLE_ID;
    const existing = buckets.get(laneId) ?? [];
    existing.push(story);
    buckets.set(laneId, existing);
  }

  const lanes: BoardSwimlane[] = [];

  const sortedCycles = [...cycles].sort((left, right) => right.number - left.number);
  for (const cycle of sortedCycles) {
    const laneStories = buckets.get(cycle.id);
    if (laneStories && laneStories.length > 0) {
      lanes.push({
        id: cycle.id,
        label: cycleNameById.get(cycle.id) ?? `Cycle ${cycle.number}`,
        stories: laneStories,
      });
      buckets.delete(cycle.id);
    }
  }

  const unassigned = buckets.get(UNASSIGNED_CYCLE_ID);
  if (unassigned && unassigned.length > 0) {
    lanes.push({
      id: UNASSIGNED_CYCLE_ID,
      label: 'No Cycle',
      stories: unassigned,
    });
  }

  return lanes;
}
