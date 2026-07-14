# Chain of Thought — task-09j instant markdown editor (iteration 2)

1. **Blocking gap (G1):** Independent review confirmed `@tiptap/markdown@3.27.1` ships no paste rules; StarterKit input rules do not fire on paste. Iteration 1 incorrectly asserted paste worked via a nonexistent mechanism.
2. **Root cause:** `instant-markdown-editor.tsx` `editorProps` only set `attributes` — no `handlePaste` / `clipboardTextParser`.
3. **Fix:** Add `editorProps.handlePaste` that intercepts plain-text clipboard (`text/plain` without `text/html`), calls `editor.commands.insertContent(text, { contentType: 'markdown' })`, returns `true` to skip default literal insert. Use `editorRef` + `readOnlyRef` because `useEditor` initializes before the editor instance exists.
4. **G2 mitigation:** Add Storybook `play` stories `TypeMarkdownConversion` and `PasteMarkdownConversion` asserting `<strong>`, `<h1>`, and `<ul li>` after type/paste. No test-runner in repo; plays execute in Storybook interactions panel.
5. **Report correction:** Update instant-markdown-editor-report.md mechanism section — paste via custom handler, not `@tiptap/markdown` paste rules.
6. **Verification:** `pnpm --filter @landi-flow/ui typecheck` → exit 0.
