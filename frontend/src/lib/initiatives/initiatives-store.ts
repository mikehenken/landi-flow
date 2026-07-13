import type { Initiative, InitiativeSettings } from '@landi-flow/core/types';
import { isMockAuthEnabled } from '@/lib/api/config';
import { DEMO_WORKSPACE_ID } from '@/lib/seed-data';

export const INITIATIVES_STORAGE_KEY = 'landi-flow:initiatives';
export const INITIATIVE_SETTINGS_STORAGE_KEY = 'landi-flow:initiative-settings';

/** Demo seed — MOCK_AUTH only. Never surface in live UUID workspaces. */
export const SEED_INITIATIVES: Initiative[] = [
  {
    id: 'initiative-q3',
    workspace_id: DEMO_WORKSPACE_ID,
    name: 'Q3 — Easier than Linear',
    description_md: 'Ship progressive disclosure shell, agent collaboration, and artifact system.',
    status: 'active',
    owner_id: 'user-jane',
    start_date: '2026-07-01',
    target_date: '2026-09-30',
    epic_ids: ['epic-001', 'epic-002'],
    created_at: '2026-07-01T10:00:00.000Z',
    updated_at: '2026-07-06T12:00:00.000Z',
  },
  {
    id: 'initiative-q4',
    workspace_id: DEMO_WORKSPACE_ID,
    name: 'Q4 — Platform scale',
    description_md: 'Initiatives, Pulse, and roadmap timeline for portfolio planning.',
    status: 'planned',
    owner_id: 'user-alex',
    start_date: '2026-10-01',
    target_date: '2026-12-31',
    epic_ids: ['epic-003'],
    created_at: '2026-07-02T10:00:00.000Z',
    updated_at: '2026-07-02T10:00:00.000Z',
  },
];

const DEFAULT_SETTINGS: InitiativeSettings = {
  workspace_id: DEMO_WORKSPACE_ID,
  enabled: true,
  schedule_cadence: 'weekly',
  updated_at: '2026-07-01T10:00:00.000Z',
};

function emptySettings(workspaceId: string): InitiativeSettings {
  return {
    workspace_id: workspaceId,
    enabled: true,
    schedule_cadence: 'weekly',
    updated_at: new Date().toISOString(),
  };
}

function readInitiatives(): Initiative[] {
  // Live mode must never invent demo portfolio rows — use `/api/initiatives`.
  if (!isMockAuthEnabled()) {
    return [];
  }
  if (typeof window === 'undefined') {
    return SEED_INITIATIVES;
  }
  try {
    const raw = window.localStorage.getItem(INITIATIVES_STORAGE_KEY);
    if (!raw) {
      return SEED_INITIATIVES;
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Initiative[]) : SEED_INITIATIVES;
  } catch {
    return SEED_INITIATIVES;
  }
}

function writeInitiatives(rows: Initiative[]): void {
  if (typeof window === 'undefined' || !isMockAuthEnabled()) {
    return;
  }
  try {
    window.localStorage.setItem(INITIATIVES_STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // ignore
  }
}

export function listInitiatives(workspaceId: string = DEMO_WORKSPACE_ID): Initiative[] {
  if (!isMockAuthEnabled()) {
    return [];
  }
  return readInitiatives().filter((row) => row.workspace_id === workspaceId);
}

export function getInitiativeById(initiativeId: string): Initiative | undefined {
  if (!isMockAuthEnabled()) {
    return undefined;
  }
  return readInitiatives().find((row) => row.id === initiativeId);
}

export function readInitiativeSettings(
  workspaceId: string = DEMO_WORKSPACE_ID,
): InitiativeSettings {
  if (!isMockAuthEnabled()) {
    return emptySettings(workspaceId);
  }
  if (typeof window === 'undefined') {
    return { ...DEFAULT_SETTINGS, workspace_id: workspaceId };
  }
  try {
    const raw = window.localStorage.getItem(INITIATIVE_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS, workspace_id: workspaceId };
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_SETTINGS, workspace_id: workspaceId };
    }
    const record = parsed as Partial<InitiativeSettings>;
    return {
      workspace_id: workspaceId,
      enabled: record.enabled ?? DEFAULT_SETTINGS.enabled,
      schedule_cadence: record.schedule_cadence ?? DEFAULT_SETTINGS.schedule_cadence,
      updated_at: record.updated_at ?? new Date().toISOString(),
    };
  } catch {
    return { ...DEFAULT_SETTINGS, workspace_id: workspaceId };
  }
}

export function writeInitiativeSettings(settings: InitiativeSettings): void {
  if (typeof window === 'undefined' || !isMockAuthEnabled()) {
    return;
  }
  try {
    window.localStorage.setItem(INITIATIVE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function attachEpicToInitiative(initiativeId: string, epicId: string): Initiative | null {
  if (!isMockAuthEnabled()) {
    return null;
  }
  const rows = readInitiatives();
  const index = rows.findIndex((row) => row.id === initiativeId);
  if (index < 0) {
    return null;
  }
  const current = rows[index]!;
  if (current.epic_ids.includes(epicId)) {
    return current;
  }
  const updated: Initiative = {
    ...current,
    epic_ids: [...current.epic_ids, epicId],
    updated_at: new Date().toISOString(),
  };
  const next = rows.map((row, i) => (i === index ? updated : row));
  writeInitiatives(next);
  return updated;
}

export function createInitiative(
  name: string,
  status: Initiative['status'] = 'planned',
  workspaceId: string = DEMO_WORKSPACE_ID,
): Initiative {
  const now = new Date().toISOString();
  const initiative: Initiative = {
    id: `initiative-${crypto.randomUUID()}`,
    workspace_id: workspaceId,
    name,
    description_md: null,
    status,
    owner_id: 'user-jane',
    start_date: null,
    target_date: null,
    epic_ids: [],
    created_at: now,
    updated_at: now,
  };
  if (isMockAuthEnabled()) {
    writeInitiatives([...readInitiatives(), initiative]);
  }
  return initiative;
}
