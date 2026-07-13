import type { EpicStatusCategory } from '@landi-flow/core/types';
import { EPIC_STATUS_IDS } from '@/lib/epic-status';

export interface EpicStatusRef {
  id: string;
  name: string;
  category: EpicStatusCategory;
}

const COMPLETE_ALIASES = new Set([
  'complete',
  'completed',
  'done',
  'finished',
  'closed',
  'resolved',
]);

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase();
}

/** Resolve epic status by UUID, mock slug, name, category, or completion alias. */
export function resolveEpicStatusId(
  statuses: EpicStatusRef[],
  reference: string | null | undefined,
  options?: { intent?: 'complete' | 'default'; defaultStatusId?: string | null },
): string | null {
  if (!reference || reference.length === 0) {
    if (options?.intent === 'complete') {
      return statuses.find((status) => status.category === 'completed')?.id ?? null;
    }
    if (options?.intent === 'default') {
      return options.defaultStatusId ?? statuses[0]?.id ?? null;
    }
    return null;
  }

  const normalized = normalizeLookup(reference);
  const byId = statuses.find((status) => status.id === reference);
  if (byId) {
    return byId.id;
  }

  const slugCategoryEntry = Object.entries(EPIC_STATUS_IDS).find(([, slug]) => slug === reference);
  if (slugCategoryEntry) {
    const [category] = slugCategoryEntry;
    const bySlugCategory = statuses.find((status) => status.category === category);
    if (bySlugCategory) {
      return bySlugCategory.id;
    }
  }

  const byName = statuses.find((status) => normalizeLookup(status.name) === normalized);
  if (byName) {
    return byName.id;
  }

  const byCategory = statuses.find((status) => normalizeLookup(status.category) === normalized);
  if (byCategory) {
    return byCategory.id;
  }

  if (COMPLETE_ALIASES.has(normalized)) {
    return statuses.find((status) => status.category === 'completed')?.id ?? null;
  }

  return reference;
}
