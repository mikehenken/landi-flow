import { describe, expect, it } from 'vitest';
import {
  looksLikeUnparsedMarkdown,
  resolveInstantMarkdownInitialContent,
  shouldApplyExternalMarkdownValue,
  shouldPersistDescriptionMarkdownChange,
  shouldReparseCollaborativePlaintext,
  shouldSeedCollaborativeMarkdown,
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

describe('shouldSeedCollaborativeMarkdown', () => {
  it('seeds when persisted markdown exists but Yjs room is empty', () => {
    expect(shouldSeedCollaborativeMarkdown('# Hello', '')).toBe(true);
    expect(shouldSeedCollaborativeMarkdown('Body', '   ')).toBe(true);
  });

  it('skips when both sides empty or editor already has content', () => {
    expect(shouldSeedCollaborativeMarkdown('', '')).toBe(false);
    expect(shouldSeedCollaborativeMarkdown('# Hello', '# Hello')).toBe(false);
  });
});

describe('looksLikeUnparsedMarkdown', () => {
  it('detects common markdown block syntax', () => {
    expect(looksLikeUnparsedMarkdown('# Heading\n\nBody')).toBe(true);
    expect(looksLikeUnparsedMarkdown('**bold** text')).toBe(true);
    expect(looksLikeUnparsedMarkdown('- list item')).toBe(true);
    expect(looksLikeUnparsedMarkdown('Plain paragraph only.')).toBe(false);
  });
});

describe('shouldReparseCollaborativePlaintext', () => {
  it('reparse when editor mirrors persisted raw markdown source', () => {
    const body = '# GEN-3\n\n**Settings** wiring';
    expect(shouldReparseCollaborativePlaintext(body, body)).toBe(true);
  });

  it('skips when editor markdown differs from persisted (already parsed)', () => {
    expect(
      shouldReparseCollaborativePlaintext('# Hello', 'Hello'),
    ).toBe(false);
  });

  it('skips when persisted has no markdown syntax', () => {
    expect(
      shouldReparseCollaborativePlaintext('Plain text', 'Plain text'),
    ).toBe(false);
  });
});

describe('shouldPersistDescriptionMarkdownChange', () => {
  it('blocks empty save that would wipe non-empty description_md before user edits', () => {
    expect(
      shouldPersistDescriptionMarkdownChange('# Session summary', '', '# Session summary'),
    ).toBe(false);
  });

  it('allows intentional clear after editor emitted different markdown', () => {
    expect(
      shouldPersistDescriptionMarkdownChange('# Session summary', '', ''),
    ).toBe(true);
  });

  it('allows normal updates and empty saves when already empty', () => {
    expect(shouldPersistDescriptionMarkdownChange('', '', '')).toBe(true);
    expect(
      shouldPersistDescriptionMarkdownChange('# Old', '# New', '# Old'),
    ).toBe(true);
  });
});
