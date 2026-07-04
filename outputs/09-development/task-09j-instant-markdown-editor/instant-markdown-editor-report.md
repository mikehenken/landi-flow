# Instant Markdown Editor Report — STUDY-013 Phase 09 task-09j

**Study ID:** STUDY-013  
**Task:** task-09j dev-instant-markdown-editor  
**Iteration:** 1  
**Repo:** `landi-flow`  
**Date:** 2026-07-04

---

## Summary

Implemented the **Differentiator #2** in-place markdown ↔ rich-text editor using **Tiptap 3 + `@tiptap/markdown`**, styled with the shared `@landi-flow/ui` design system. Epic and Story detail surfaces now use the editor for `description_md`, with optional **Liveblocks co-editing** via the existing task-09h collaboration seam when `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` is configured.

---

## Architecture

| Layer | Location | Role |
|-------|----------|------|
| Core editor | `packages/ui/src/components/editor/` | Tiptap + Markdown extension, design-token prose styles |
| Extension factory | `create-instant-markdown-extensions.ts` | StarterKit, Markdown, Link, TaskList, Placeholder |
| Collaboration wrapper | `frontend/src/components/collaborative-description-editor.tsx` | `CollaborativeRoom` + `useLiveblocksExtension` |
| View wiring | `description-editor.tsx`, Epic page, Story/Epic inspectors | Debounced store updates |

### Instant render mechanism

- **Input rules** (StarterKit): `**bold**`, `# heading`, `- list`, etc. convert as you type.
- **Paste handler** (`editorProps.handlePaste`): plain-text clipboard paste routes through `insertContent(text, { contentType: 'markdown' })`. `@tiptap/markdown` does not ship paste rules; input rules do not fire on paste in ProseMirror. Rich HTML paste is left to the default handler.
- **Round-trip**: `editor.getMarkdown()` serializes back to `description_md` for API/MCP export parity.

### Liveblocks integration (task-09h)

When Liveblocks keys are present:

- Room IDs follow `@landi-flow/collaboration` grammar: `linear_clone:{workspaceId}:{epic|story}:{entityId}`
- `useLiveblocksExtension({ field: 'description' })` injects Yjs-backed co-editing
- StarterKit `undoRedo` disabled in collaborative mode (Liveblocks owns history)
- Falls back to local-only editor when keys are absent (demo/CI safe)

---

## Files Added / Modified

### New (`packages/ui`)

- `src/components/editor/instant-markdown-editor.tsx`
- `src/components/editor/create-instant-markdown-extensions.ts`
- `src/components/editor/editor-styles.css`
- `src/components/editor/instant-markdown-editor.stories.tsx`
- `src/components/editor/index.ts`

### New (`frontend`)

- `src/components/collaborative-description-editor.tsx`
- `src/components/description-editor.tsx`

### Modified

- `packages/ui/src/index.ts` — export editor
- `packages/ui/package.json` — Tiptap deps, `./editor-styles` export
- `frontend/src/app/globals.css` — import editor styles
- `frontend/src/stores/epic-store.ts` — `updateEpicDescription`
- `frontend/src/stores/story-store.ts` — `updateStoryDescription`
- `frontend/src/app/workspace/epics/[epicId]/page.tsx` — Epic description editor
- `frontend/src/components/story-inspector.tsx` — Story + Epic inspector editors
- `packages/ui/.storybook/preview.tsx` — editor styles in Storybook

### Dependencies

**`@landi-flow/ui`:** `@tiptap/core`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/markdown`, `@tiptap/extension-*`, `marked`

**`@landi-flow/frontend`:** `@liveblocks/react-tiptap` (uses existing `@liveblocks/client`, `@liveblocks/react`, `@liveblocks/node`)

---

## Integration Points

| Surface | Editor variant | Store mutation |
|---------|----------------|----------------|
| Epic detail page (`/workspace/epics/[epicId]`) | default | `epicStore.updateEpicDescription` |
| Story inspector (right panel) | compact | `storyStore.updateStoryDescription` |
| Epic inspector (right panel) | compact | `epicStore.updateEpicDescription` |

Changes debounce at 350ms before store notify (optimistic local state; API persistence deferred to backend wiring).

---

## Verification

| Check | Result |
|-------|--------|
| `pnpm --filter @landi-flow/ui typecheck` | ✅ Pass |
| `pnpm --filter @landi-flow/ui lint` | ✅ Pass |
| `pnpm --filter @landi-flow/frontend lint` | ✅ Pass (ESLint) |
| Storybook story | ✅ `Editor/InstantMarkdownEditor` |
| Frontend typecheck | ⚠️ Pre-existing task-09h collaboration TS errors (not introduced by this task) |

---

## Known Gaps (iteration 1)

1. **API persistence** — Store updates are local-only; PATCH to Workers API for `description_md` is a follow-up.
2. **Collaboration type errors** — task-09h Liveblocks typings need alignment with `@liveblocks/react` v3 (pre-existing).
3. **Slash commands / floating toolbar** — Out of scope for iteration 1; input/paste rules cover core instant-markdown differentiator.
4. **Mermaid / tables** — StarterKit subset only; extend extensions in a later iteration.

---

## References

- STUDY-013 `research-event-driven-and-markdown-editor.md` (Tiptap + Liveblocks recommendation)
- `@landi-flow/collaboration` room grammar (`packages/collaboration/src/rooms.ts`)
- Linear editor behavior spec (instant paste/type conversion)

*Generated: 2026-07-04 — STUDY-013 Phase 09 task-09j iteration 1 (nextjs-developer self-review)*
