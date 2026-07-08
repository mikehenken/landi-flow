import type { View } from '@landi-flow/core/types';
import { DEMO_WORKSPACE_ID, SEED_SAVED_VIEWS } from '@/lib/seed-data';

export const SAVED_VIEWS_STORAGE_KEY = 'landi-flow:saved-views';

function readViews(): View[] {
  if (typeof window === 'undefined') {
    return SEED_SAVED_VIEWS;
  }
  try {
    const raw = window.localStorage.getItem(SAVED_VIEWS_STORAGE_KEY);
    if (!raw) {
      return SEED_SAVED_VIEWS;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return SEED_SAVED_VIEWS;
    }
    return parsed as View[];
  } catch {
    return SEED_SAVED_VIEWS;
  }
}

function writeViews(views: View[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(SAVED_VIEWS_STORAGE_KEY, JSON.stringify(views));
  } catch {
    // ignore
  }
}

export function listSavedViews(workspaceId: string = DEMO_WORKSPACE_ID): View[] {
  return readViews().filter((view) => view.workspace_id === workspaceId);
}

export function upsertSavedView(view: View): void {
  const views = readViews();
  const index = views.findIndex((row) => row.id === view.id);
  const next =
    index >= 0 ? views.map((row, i) => (i === index ? view : row)) : [...views, view];
  writeViews(next);
}

export function deleteSavedView(viewId: string): void {
  writeViews(readViews().filter((row) => row.id !== viewId));
}

export function toggleViewSharing(viewId: string, isShared: boolean): View | null {
  const views = readViews();
  const index = views.findIndex((row) => row.id === viewId);
  if (index < 0) {
    return null;
  }
  const updated: View = {
    ...views[index]!,
    is_shared: isShared,
    updated_at: new Date().toISOString(),
  };
  const next = views.map((row, i) => (i === index ? updated : row));
  writeViews(next);
  return updated;
}

export function createSavedView(
  input: Pick<View, 'name' | 'scope' | 'layout' | 'team_id' | 'is_shared'>,
  workspaceId: string = DEMO_WORKSPACE_ID,
): View {
  const now = new Date().toISOString();
  const view: View = {
    id: `view-${crypto.randomUUID()}`,
    workspace_id: workspaceId,
    team_id: input.team_id ?? null,
    epic_id: null,
    owner_id: 'user-jane',
    name: input.name,
    description: null,
    scope: input.scope,
    layout: input.layout,
    filter_ast: {},
    display_options: { layout: input.layout },
    grouping: null,
    sub_grouping: null,
    is_shared: input.is_shared,
    is_favorited: false,
    created_at: now,
    updated_at: now,
  };
  upsertSavedView(view);
  return view;
}
