/** Default visible counts and batch sizes for progressive disclosure lists. */
export const SIGNALS_PAGE_DEFAULT = 5;
export const SIGNALS_PAGE_BATCH = 5;
export const ARTIFACTS_PAGE_DEFAULT = 10;
export const ARTIFACTS_PAGE_BATCH = 10;

export interface PaginationMeta {
  hasMore: boolean;
  remainingCount: number;
  nextBatchSize: number;
}

export function sliceVisibleItems<T>(items: readonly T[], visibleCount: number): T[] {
  return items.slice(0, visibleCount);
}

export function getPaginationMeta(
  totalCount: number,
  visibleCount: number,
  batchSize: number,
): PaginationMeta {
  const remainingCount = Math.max(0, totalCount - visibleCount);
  return {
    hasMore: remainingCount > 0,
    remainingCount,
    nextBatchSize: Math.min(batchSize, remainingCount),
  };
}

/** Expand visible window so `index` is included (for deep-link / highlight scroll). */
export function ensureIndexVisible(
  currentVisible: number,
  index: number,
  defaultVisible: number,
): number {
  if (index < 0) {
    return currentVisible;
  }
  return Math.max(currentVisible, index + 1, defaultVisible);
}

export function getNextVisibleCount(
  currentVisible: number,
  batchSize: number,
  totalCount: number,
): number {
  return Math.min(currentVisible + batchSize, totalCount);
}

export function buildListResetKey(parts: Array<string | number | null | undefined>): string {
  return parts.map((part) => String(part ?? '')).join(':');
}
