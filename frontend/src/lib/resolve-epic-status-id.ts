import type { EpicStatusCategory } from '@landi-flow/core/types';
import { resolveEpicStatusId as resolveEpicStatusIdCore, type McpEpicStatusRef } from '@landi-flow/core/mcp';
import { EPIC_STATUS_IDS } from '@/lib/epic-status';

export interface EpicStatusRef {
  id: string;
  name: string;
  category: EpicStatusCategory;
}

/** Resolve epic status by UUID, mock slug, name, category, or completion alias. */
export function resolveEpicStatusId(
  statuses: EpicStatusRef[],
  reference: string | null | undefined,
  options?: { intent?: 'complete' | 'default'; defaultStatusId?: string | null },
): string | null {
  const withSlugs: McpEpicStatusRef[] = statuses.map((status) => {
    const slugEntry = Object.entries(EPIC_STATUS_IDS).find(([, id]) => id === status.id);
    return {
      ...status,
      slug: slugEntry?.[0]?.replace(/_/g, '-') ?? status.category.replace(/_/g, '-'),
    };
  });
  return resolveEpicStatusIdCore(withSlugs, reference, options);
}
