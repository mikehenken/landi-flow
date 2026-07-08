import type { Cycle } from '@landi-flow/core/types';
import { DEMO_CYCLES, DEMO_TEAM_ID, DEMO_WORKSPACE_ID } from '@/lib/seed-data';

export const CYCLES_STORAGE_KEY = 'landi-flow:cycles';
export const CYCLE_AUTOMATION_STORAGE_KEY = 'landi-flow:cycle-automation';

export interface CycleAutomationSettings {
  team_id: string;
  auto_add_stories: boolean;
  rollover_incomplete: boolean;
  last_run_at: string | null;
}

const DEFAULT_AUTOMATION: CycleAutomationSettings = {
  team_id: DEMO_TEAM_ID,
  auto_add_stories: true,
  rollover_incomplete: true,
  last_run_at: null,
};

function readCycles(): Cycle[] {
  if (typeof window === 'undefined') {
    return DEMO_CYCLES;
  }
  try {
    const raw = window.localStorage.getItem(CYCLES_STORAGE_KEY);
    if (!raw) {
      return DEMO_CYCLES;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEMO_CYCLES;
    }
    return parsed as Cycle[];
  } catch {
    return DEMO_CYCLES;
  }
}

function writeCycles(cycles: Cycle[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(CYCLES_STORAGE_KEY, JSON.stringify(cycles));
  } catch {
    // ignore
  }
}

export function listCyclesForTeam(teamId: string = DEMO_TEAM_ID): Cycle[] {
  return readCycles()
    .filter((cycle) => cycle.team_id === teamId)
    .sort((a, b) => b.number - a.number);
}

export function getActiveCycle(teamId: string = DEMO_TEAM_ID): Cycle | undefined {
  return listCyclesForTeam(teamId).find((cycle) => cycle.completed_at === null);
}

export function createCycle(
  teamId: string,
  name: string,
  startsAt: string,
  endsAt: string,
): Cycle {
  const cycles = readCycles().filter((c) => c.team_id === teamId);
  const nextNumber = cycles.reduce((max, c) => Math.max(max, c.number), 0) + 1;
  const now = new Date().toISOString();
  const cycle: Cycle = {
    id: `cycle-${crypto.randomUUID()}`,
    team_id: teamId,
    workspace_id: DEMO_WORKSPACE_ID,
    name,
    number: nextNumber,
    starts_at: startsAt,
    ends_at: endsAt,
    completed_at: null,
    settings: {},
    created_at: now,
    updated_at: now,
  };
  writeCycles([...readCycles(), cycle]);
  return cycle;
}

export function completeCycle(cycleId: string): Cycle | null {
  const cycles = readCycles();
  const index = cycles.findIndex((c) => c.id === cycleId);
  if (index < 0) {
    return null;
  }
  const updated: Cycle = {
    ...cycles[index]!,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const next = cycles.map((c, i) => (i === index ? updated : c));
  writeCycles(next);
  return updated;
}

export function readCycleAutomation(teamId: string = DEMO_TEAM_ID): CycleAutomationSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_AUTOMATION, team_id: teamId };
  }
  try {
    const raw = window.localStorage.getItem(CYCLE_AUTOMATION_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_AUTOMATION, team_id: teamId };
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_AUTOMATION, team_id: teamId };
    }
    const record = parsed as Partial<CycleAutomationSettings>;
    return {
      team_id: teamId,
      auto_add_stories: record.auto_add_stories ?? DEFAULT_AUTOMATION.auto_add_stories,
      rollover_incomplete: record.rollover_incomplete ?? DEFAULT_AUTOMATION.rollover_incomplete,
      last_run_at: record.last_run_at ?? null,
    };
  } catch {
    return { ...DEFAULT_AUTOMATION, team_id: teamId };
  }
}

export function writeCycleAutomation(settings: CycleAutomationSettings): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(CYCLE_AUTOMATION_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

/** CAP-062: simulate automation run — records timestamp for proof. */
export function runCycleAutomation(teamId: string = DEMO_TEAM_ID): CycleAutomationSettings {
  const settings = readCycleAutomation(teamId);
  const updated: CycleAutomationSettings = {
    ...settings,
    last_run_at: new Date().toISOString(),
  };
  writeCycleAutomation(updated);
  return updated;
}
