import type {
  EpicAttachedView,
  EpicCustomerLink,
  EpicTeamLink,
} from '@landi-flow/core/types';
import { DEMO_TEAM_ID } from '@/lib/seed-data';

export const EPIC_CUSTOMERS_STORAGE_KEY = 'landi-flow:epic-customers';
export const EPIC_TEAMS_STORAGE_KEY = 'landi-flow:epic-teams';
export const EPIC_ATTACHED_VIEWS_STORAGE_KEY = 'landi-flow:epic-attached-views';

const SEED_CUSTOMER_LINKS: EpicCustomerLink[] = [
  {
    id: 'ecl-001',
    epic_id: 'epic-001',
    customer_id: 'customer-acme',
    created_at: '2026-07-01T10:00:00.000Z',
  },
];

const SEED_TEAM_LINKS: EpicTeamLink[] = [
  {
    id: 'etl-001',
    epic_id: 'epic-001',
    team_id: DEMO_TEAM_ID,
    created_at: '2026-07-01T10:00:00.000Z',
  },
  {
    id: 'etl-002',
    epic_id: 'epic-001',
    team_id: 'team-engineering',
    created_at: '2026-07-02T10:00:00.000Z',
  },
];

const SEED_ATTACHED_VIEWS: EpicAttachedView[] = [
  {
    id: 'eav-001',
    epic_id: 'epic-001',
    view_id: 'view-my-active',
    position: 0,
    created_at: '2026-07-03T10:00:00.000Z',
  },
];

function readJson<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, rows: T[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    // ignore
  }
}

export function listEpicCustomerLinks(epicId: string): EpicCustomerLink[] {
  return readJson(EPIC_CUSTOMERS_STORAGE_KEY, SEED_CUSTOMER_LINKS).filter(
    (row) => row.epic_id === epicId,
  );
}

export function linkCustomerToEpic(epicId: string, customerId: string): EpicCustomerLink {
  const link: EpicCustomerLink = {
    id: `ecl-${crypto.randomUUID()}`,
    epic_id: epicId,
    customer_id: customerId,
    created_at: new Date().toISOString(),
  };
  writeJson(EPIC_CUSTOMERS_STORAGE_KEY, [
    ...readJson(EPIC_CUSTOMERS_STORAGE_KEY, SEED_CUSTOMER_LINKS),
    link,
  ]);
  return link;
}

export function listEpicTeamLinks(epicId: string): EpicTeamLink[] {
  return readJson(EPIC_TEAMS_STORAGE_KEY, SEED_TEAM_LINKS).filter((row) => row.epic_id === epicId);
}

export function listEpicAttachedViews(epicId: string): EpicAttachedView[] {
  return readJson(EPIC_ATTACHED_VIEWS_STORAGE_KEY, SEED_ATTACHED_VIEWS)
    .filter((row) => row.epic_id === epicId)
    .sort((a, b) => a.position - b.position);
}

export function attachViewToEpic(epicId: string, viewId: string): EpicAttachedView {
  const existing = listEpicAttachedViews(epicId);
  const link: EpicAttachedView = {
    id: `eav-${crypto.randomUUID()}`,
    epic_id: epicId,
    view_id: viewId,
    position: existing.length,
    created_at: new Date().toISOString(),
  };
  writeJson(EPIC_ATTACHED_VIEWS_STORAGE_KEY, [
    ...readJson(EPIC_ATTACHED_VIEWS_STORAGE_KEY, SEED_ATTACHED_VIEWS),
    link,
  ]);
  return link;
}
