export const BOARD_HIDDEN_COLUMNS_STORAGE_KEY = 'landi-flow:board-hidden-columns';

export function readHiddenColumnIds(teamId: string): Set<string> {
  if (typeof window === 'undefined') {
    return new Set();
  }
  try {
    const raw = window.localStorage.getItem(BOARD_HIDDEN_COLUMNS_STORAGE_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return new Set();
    }
    const record = parsed as Record<string, string[]>;
    const ids = record[teamId] ?? [];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

export function writeHiddenColumnIds(teamId: string, hiddenIds: Set<string>): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const raw = window.localStorage.getItem(BOARD_HIDDEN_COLUMNS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    const record =
      typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, string[]>)
        : {};
    record[teamId] = [...hiddenIds];
    window.localStorage.setItem(BOARD_HIDDEN_COLUMNS_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // ignore
  }
}

export function toggleColumnVisibility(teamId: string, stateId: string): Set<string> {
  const hidden = readHiddenColumnIds(teamId);
  if (hidden.has(stateId)) {
    hidden.delete(stateId);
  } else {
    hidden.add(stateId);
  }
  writeHiddenColumnIds(teamId, hidden);
  return hidden;
}
