import { describe, expect, it } from 'vitest';
import {
  ARTIFACTS_PAGE_BATCH,
  ARTIFACTS_PAGE_DEFAULT,
  buildListResetKey,
  ensureIndexVisible,
  getNextVisibleCount,
  getPaginationMeta,
  SIGNALS_PAGE_BATCH,
  SIGNALS_PAGE_DEFAULT,
  sliceVisibleItems,
} from '@/lib/list-pagination';

describe('list-pagination', () => {
  it('exposes expected default page sizes', () => {
    expect(SIGNALS_PAGE_DEFAULT).toBe(5);
    expect(SIGNALS_PAGE_BATCH).toBe(5);
    expect(ARTIFACTS_PAGE_DEFAULT).toBe(10);
    expect(ARTIFACTS_PAGE_BATCH).toBe(10);
  });

  it('slices visible items from the start of the list', () => {
    expect(sliceVisibleItems(['a', 'b', 'c'], 2)).toEqual(['a', 'b']);
    expect(sliceVisibleItems(['a', 'b', 'c'], 10)).toEqual(['a', 'b', 'c']);
  });

  it('computes pagination metadata', () => {
    expect(getPaginationMeta(12, 5, 5)).toEqual({
      hasMore: true,
      remainingCount: 7,
      nextBatchSize: 5,
    });
    expect(getPaginationMeta(7, 5, 5)).toEqual({
      hasMore: true,
      remainingCount: 2,
      nextBatchSize: 2,
    });
    expect(getPaginationMeta(3, 5, 5)).toEqual({
      hasMore: false,
      remainingCount: 0,
      nextBatchSize: 0,
    });
  });

  it('expands visible count for highlighted index', () => {
    expect(ensureIndexVisible(5, 3, 5)).toBe(5);
    expect(ensureIndexVisible(5, 7, 5)).toBe(8);
    expect(ensureIndexVisible(2, -1, 5)).toBe(2);
  });

  it('advances visible count by batch up to total', () => {
    expect(getNextVisibleCount(5, 5, 12)).toBe(10);
    expect(getNextVisibleCount(10, 5, 12)).toBe(12);
  });

  it('builds stable reset keys', () => {
    expect(buildListResetKey([3, 'evt-1', 'evt-9'])).toBe('3:evt-1:evt-9');
    expect(buildListResetKey([0, null, undefined])).toBe('0::');
  });
});
