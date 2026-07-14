/**
 * Guards external `value` → editor sync for InstantMarkdownEditor.
 *
 * In Liveblocks collaborative mode, Yjs owns document state. Applying `setContent`
 * from React props fights the Yjs binding and duplicates body text on focus/load.
 *
 * Linear-inspired pattern: description body is isolated from sidebar metadata
 * mutations — props must not re-seed the Yjs document on unrelated story updates.
 */
export function shouldApplyExternalMarkdownValue(
  collaborative: boolean,
  nextValue: string,
  lastEmitted: string,
): boolean {
  if (collaborative) {
    return false;
  }
  return nextValue !== lastEmitted;
}

/** Liveblocks requires seeding via our markdown-aware path — not useEditor `content`. */
export function resolveInstantMarkdownInitialContent(
  collaborative: boolean,
  value: string | null,
): string | undefined {
  if (collaborative) {
    return undefined;
  }
  return value ?? '';
}

/** Seed Yjs from `description_md` when the Liveblocks room synced empty. */
export function shouldSeedCollaborativeMarkdown(
  persistedValue: string,
  editorMarkdown: string,
): boolean {
  return persistedValue.trim().length > 0 && editorMarkdown.trim().length === 0;
}

/**
 * Detect Yjs rooms seeded by Liveblocks `initialContent` without `contentType: 'markdown'`.
 * Those rooms store markdown syntax as literal plain text (visible `#`, `**`, backticks).
 */
export function looksLikeUnparsedMarkdown(text: string): boolean {
  return /^(#{1,6}\s|[-*]\s|\d+\.\s|```|>\s|\*\*[^*])/m.test(text);
}

/**
 * Reparse when persisted markdown and editor output match as raw source — headings/lists
 * were never converted to TipTap block nodes (GEN-3 regression after metadata edits).
 */
export function shouldReparseCollaborativePlaintext(
  persistedValue: string,
  editorMarkdown: string,
): boolean {
  const persistedTrimmed = persistedValue.trim();
  const editorTrimmed = editorMarkdown.trim();
  if (persistedTrimmed.length === 0 || editorTrimmed.length === 0) {
    return false;
  }
  if (!looksLikeUnparsedMarkdown(persistedTrimmed)) {
    return false;
  }
  return persistedTrimmed === editorTrimmed;
}

/**
 * Block spurious empty saves when an empty Liveblocks room hydrates before Yjs seeding.
 * Allows intentional clears once the editor has emitted different markdown.
 */
export function shouldPersistDescriptionMarkdownChange(
  previousMarkdown: string | null | undefined,
  nextMarkdown: string,
  lastEmittedMarkdown: string,
): boolean {
  const previousTrimmed = (previousMarkdown ?? '').trim();
  const nextTrimmed = nextMarkdown.trim();
  const lastEmittedTrimmed = lastEmittedMarkdown.trim();

  if (
    nextTrimmed === '' &&
    previousTrimmed !== '' &&
    lastEmittedTrimmed === previousTrimmed
  ) {
    return false;
  }

  return true;
}
