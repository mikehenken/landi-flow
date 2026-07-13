/**
 * Guards external `value` → editor sync for InstantMarkdownEditor.
 *
 * In Liveblocks collaborative mode, Yjs owns document state. Applying `setContent`
 * from React props fights the Yjs binding and duplicates body text on focus/load.
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

/** Liveblocks requires seeding via useLiveblocksExtension — not useEditor `content`. */
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
