import type { Epic, EpicStatusCategory } from '@landi-flow/core/types';

/** Maps Epic.status_id values to UI status categories. */
export const EPIC_STATUS_IDS: Record<EpicStatusCategory, string> = {
  backlog: 'epic-status-backlog',
  planned: 'epic-status-planned',
  in_progress: 'epic-status-in-progress',
  completed: 'epic-status-completed',
  cancelled: 'epic-status-cancelled',
};

export function getEpicStatusCategory(epic: Epic): EpicStatusCategory {
  const match = Object.entries(EPIC_STATUS_IDS).find(
    ([, statusId]) => statusId === epic.status_id,
  );
  return (match?.[0] as EpicStatusCategory | undefined) ?? 'backlog';
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
