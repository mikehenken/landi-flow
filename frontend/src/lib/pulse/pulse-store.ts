import type { PulseSchedule, PulseUpdate } from '@landi-flow/core/types';
import { isMockAuthEnabled } from '@/lib/api/config';
import { DEMO_WORKSPACE_ID } from '@/lib/seed-data';

export const PULSE_UPDATES_STORAGE_KEY = 'landi-flow:pulse-updates';
export const PULSE_SCHEDULES_STORAGE_KEY = 'landi-flow:pulse-schedules';

/** Demo seed — MOCK_AUTH only. Never surface in live UUID workspaces. */
export const SEED_PULSE_UPDATES: PulseUpdate[] = [
  {
    id: 'pulse-001',
    workspace_id: DEMO_WORKSPACE_ID,
    epic_id: 'epic-001',
    title: 'Progressive disclosure shell — Alpha complete',
    body_md: 'Sidebar defaults open; view options drawer ships with three-click rule.',
    author_id: 'user-jane',
    created_at: '2026-07-06T09:00:00.000Z',
  },
  {
    id: 'pulse-002',
    workspace_id: DEMO_WORKSPACE_ID,
    epic_id: 'epic-002',
    title: 'Agent roster now assignable',
    body_md: 'Cursor and native agents appear in assignee picker with runtime badges.',
    author_id: 'user-alex',
    created_at: '2026-07-05T14:00:00.000Z',
  },
];

export const SEED_PULSE_SCHEDULES: PulseSchedule[] = [
  {
    id: 'pulse-sched-001',
    workspace_id: DEMO_WORKSPACE_ID,
    label: 'Weekly epic digest',
    cadence: 'weekly',
    enabled: true,
    last_run_at: null,
    created_at: '2026-07-01T10:00:00.000Z',
    updated_at: '2026-07-01T10:00:00.000Z',
  },
];

function readUpdates(): PulseUpdate[] {
  if (!isMockAuthEnabled()) {
    return [];
  }
  if (typeof window === 'undefined') {
    return SEED_PULSE_UPDATES;
  }
  try {
    const raw = window.localStorage.getItem(PULSE_UPDATES_STORAGE_KEY);
    if (!raw) {
      return SEED_PULSE_UPDATES;
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PulseUpdate[]) : SEED_PULSE_UPDATES;
  } catch {
    return SEED_PULSE_UPDATES;
  }
}

function readSchedules(): PulseSchedule[] {
  if (!isMockAuthEnabled()) {
    return [];
  }
  if (typeof window === 'undefined') {
    return SEED_PULSE_SCHEDULES;
  }
  try {
    const raw = window.localStorage.getItem(PULSE_SCHEDULES_STORAGE_KEY);
    if (!raw) {
      return SEED_PULSE_SCHEDULES;
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PulseSchedule[]) : SEED_PULSE_SCHEDULES;
  } catch {
    return SEED_PULSE_SCHEDULES;
  }
}

function writeSchedules(rows: PulseSchedule[]): void {
  if (typeof window === 'undefined' || !isMockAuthEnabled()) {
    return;
  }
  try {
    window.localStorage.setItem(PULSE_SCHEDULES_STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // ignore
  }
}

export function listPulseUpdates(workspaceId: string = DEMO_WORKSPACE_ID): PulseUpdate[] {
  if (!isMockAuthEnabled()) {
    return [];
  }
  return readUpdates()
    .filter((row) => row.workspace_id === workspaceId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function listPulseSchedules(workspaceId: string = DEMO_WORKSPACE_ID): PulseSchedule[] {
  if (!isMockAuthEnabled()) {
    return [];
  }
  return readSchedules().filter((row) => row.workspace_id === workspaceId);
}

export function createPulseSchedule(
  label: string,
  cadence: PulseSchedule['cadence'] = 'weekly',
  workspaceId: string = DEMO_WORKSPACE_ID,
): PulseSchedule {
  const now = new Date().toISOString();
  const schedule: PulseSchedule = {
    id: `pulse-sched-${crypto.randomUUID()}`,
    workspace_id: workspaceId,
    label,
    cadence,
    enabled: true,
    last_run_at: null,
    created_at: now,
    updated_at: now,
  };
  if (isMockAuthEnabled()) {
    writeSchedules([...readSchedules(), schedule]);
  }
  return schedule;
}

export function runPulseSchedule(scheduleId: string): PulseSchedule | null {
  if (!isMockAuthEnabled()) {
    return null;
  }
  const rows = readSchedules();
  const index = rows.findIndex((row) => row.id === scheduleId);
  if (index < 0) {
    return null;
  }
  const updated: PulseSchedule = {
    ...rows[index]!,
    last_run_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  writeSchedules(rows.map((row, i) => (i === index ? updated : row)));
  return updated;
}
