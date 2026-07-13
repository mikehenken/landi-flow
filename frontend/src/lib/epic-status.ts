import type { Epic, EpicStatusCategory } from '@landi-flow/core/types';
import { getEpicStatuses } from '@/lib/api/workspace-context';
import type { EpicStatusRef } from '@/lib/resolve-epic-status-id';

/** Maps Epic.status_id values to UI status categories. */
export const EPIC_STATUS_IDS: Record<EpicStatusCategory, string> = {
  backlog: 'epic-status-backlog',
  planned: 'epic-status-planned',
  in_progress: 'epic-status-in-progress',
  completed: 'epic-status-completed',
  cancelled: 'epic-status-cancelled',
};

export function getEpicStatusCategory(
  epic: Epic,
  statusRoster?: EpicStatusRef[],
): EpicStatusCategory {
  const slugMatch = Object.entries(EPIC_STATUS_IDS).find(
    ([, statusId]) => statusId === epic.status_id,
  );
  if (slugMatch) {
    return slugMatch[0] as EpicStatusCategory;
  }

  const roster = statusRoster ?? getEpicStatuses();
  const statusRow = roster.find((status) => status.id === epic.status_id);
  if (statusRow) {
    return statusRow.category;
  }

  return 'backlog';
}

export const EPIC_BOARD_COLUMNS: EpicStatusCategory[] = [
  'backlog',
  'planned',
  'in_progress',
  'completed',
];

export const EPIC_STATUS_LABELS: Record<EpicStatusCategory, string> = {
  backlog: 'Backlog',
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
