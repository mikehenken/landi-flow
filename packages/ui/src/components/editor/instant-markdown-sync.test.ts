import { describe, expect, it } from 'vitest';
import {
  resolveInstantMarkdownInitialContent,
  shouldApplyExternalMarkdownValue,
} from './instant-markdown-sync';

describe('shouldApplyExternalMarkdownValue', () => {
  it('skips prop sync in collaborative mode (Yjs owns the document)', () => {
    expect(
      shouldApplyExternalMarkdownValue(true, 'Hello world', ''),
    ).toBe(false);
    expect(
      shouldApplyExternalMarkdownValue(true, 'Changed', 'Previous'),
    ).toBe(false);
  });

  it('syncs when solo and value differs from last emitted markdown', () => {
    expect(
      shouldApplyExternalMarkdownValue(false, 'New body', 'Old body'),
    ).toBe(true);
  });

  it('skips solo sync when value matches last emitted markdown', () => {
    expect(
      shouldApplyExternalMarkdownValue(false, 'Same', 'Same'),
    ).toBe(false);
  });
});

describe('resolveInstantMarkdownInitialContent', () => {
  it('returns undefined for collaborative editors (Liveblocks seeds content)', () => {
    expect(resolveInstantMarkdownInitialContent(true, 'Seed me')).toBeUndefined();
    expect(resolveInstantMarkdownInitialContent(true, null)).toBeUndefined();
  });

  it('returns markdown string for solo editors', () => {
    expect(resolveInstantMarkdownInitialContent(false, 'Hello')).toBe('Hello');
    expect(resolveInstantMarkdownInitialContent(false, null)).toBe('');
  });
});
