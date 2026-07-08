/** CAP-031: board swimlane grouping mode (Shortcut-style). */
export type BoardGroupBy = 'none' | 'epic' | 'cycle';

export const BOARD_GROUP_BY_STORAGE_KEY = 'landi-flow:board-group-by';

export const DEFAULT_BOARD_GROUP_BY: BoardGroupBy = 'none';

export function isBoardGroupBy(value: string): value is BoardGroupBy {
  return value === 'none' || value === 'epic' || value === 'cycle';
}

export function readBoardGroupByPreference(): BoardGroupBy {
  if (typeof window === 'undefined') {
    return DEFAULT_BOARD_GROUP_BY;
  }

  try {
    const stored = window.localStorage.getItem(BOARD_GROUP_BY_STORAGE_KEY);
    if (stored && isBoardGroupBy(stored)) {
      return stored;
    }
  } catch {
    // localStorage may be unavailable
  }

  return DEFAULT_BOARD_GROUP_BY;
}

export function writeBoardGroupByPreference(groupBy: BoardGroupBy): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(BOARD_GROUP_BY_STORAGE_KEY, groupBy);
  } catch {
    // Ignore quota / privacy errors
  }
}
