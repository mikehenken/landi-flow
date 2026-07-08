export type EpicDependencyType = 'blocks' | 'blocked_by';

export interface EpicDependency {
  id: string;
  source_epic_id: string;
  target_epic_id: string;
  relation_type: EpicDependencyType;
  created_at: string;
}

export const EPIC_DEPENDENCIES_STORAGE_KEY = 'landi-flow:epic-dependencies';

const SEED_DEPENDENCIES: EpicDependency[] = [
  {
    id: 'epic-dep-001',
    source_epic_id: 'epic-002',
    target_epic_id: 'epic-001',
    relation_type: 'blocked_by',
    created_at: '2026-07-02T10:00:00.000Z',
  },
];

function readDependencies(): EpicDependency[] {
  if (typeof window === 'undefined') {
    return SEED_DEPENDENCIES;
  }
  try {
    const raw = window.localStorage.getItem(EPIC_DEPENDENCIES_STORAGE_KEY);
    if (!raw) {
      return SEED_DEPENDENCIES;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return SEED_DEPENDENCIES;
    }
    return parsed as EpicDependency[];
  } catch {
    return SEED_DEPENDENCIES;
  }
}

function writeDependencies(deps: EpicDependency[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(EPIC_DEPENDENCIES_STORAGE_KEY, JSON.stringify(deps));
  } catch {
    // ignore
  }
}

export function listEpicDependencies(epicId: string): EpicDependency[] {
  return readDependencies().filter(
    (dep) => dep.source_epic_id === epicId || dep.target_epic_id === epicId,
  );
}

export function addEpicDependency(
  sourceEpicId: string,
  targetEpicId: string,
  relationType: EpicDependencyType,
): EpicDependency {
  const dep: EpicDependency = {
    id: `epic-dep-${crypto.randomUUID()}`,
    source_epic_id: sourceEpicId,
    target_epic_id: targetEpicId,
    relation_type: relationType,
    created_at: new Date().toISOString(),
  };
  writeDependencies([...readDependencies(), dep]);
  return dep;
}

export function removeEpicDependency(dependencyId: string): void {
  writeDependencies(readDependencies().filter((dep) => dep.id !== dependencyId));
}
