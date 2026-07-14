import type { Epic } from '@landi-flow/core/types';

export const MOCK_EPIC_ADDITIONS_STORAGE_KEY = 'landi-flow:mock-epic-additions';

function readEpicAdditions(): Epic[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(MOCK_EPIC_ADDITIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Epic[]) : [];
  } catch {
    return [];
  }
}

function writeEpicAdditions(epics: Epic[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(MOCK_EPIC_ADDITIONS_STORAGE_KEY, JSON.stringify(epics));
  } catch {
    // ignore storage errors
  }
}

export function applyMockEpicAdditions(epics: Epic[]): Epic[] {
  const additions = readEpicAdditions();
  if (additions.length === 0) {
    return epics;
  }
  const existingIds = new Set(epics.map((epic) => epic.id));
  const merged = [...epics];
  for (const epic of additions) {
    if (!existingIds.has(epic.id)) {
      merged.push(epic);
    }
  }
  return merged;
}

export function persistMockEpicAddition(epic: Epic): void {
  const additions = readEpicAdditions().filter((row) => row.id !== epic.id);
  writeEpicAdditions([...additions, epic]);
}

export function clearMockEpicAdditions(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(MOCK_EPIC_ADDITIONS_STORAGE_KEY);
  } catch {
    // ignore
  }
}
