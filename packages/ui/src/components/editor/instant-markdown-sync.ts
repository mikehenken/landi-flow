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
