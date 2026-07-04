# Chain of Thought — task-09j instant markdown editor

1. **Requirement:** Linear-style instant markdown ↔ rich-text in Epic/Story descriptions; shared design system; Liveblocks if available.
2. **Engine choice:** Tiptap 3 + `@tiptap/markdown` per STUDY-013 task-04l research (input rules + paste rules + round-trip).
3. **Placement:** Core component in `@landi-flow/ui` (reusable, Storybook); collaboration wrapper in frontend (Liveblocks is app concern).
4. **Collaboration:** Reused task-09h `CollaborationProvider`, `CollaborativeRoom`, and room IDs from `@landi-flow/collaboration` — no duplicate auth/client code.
5. **State:** Optimistic updates via existing pub/sub stores (`updateEpicDescription`, `updateStoryDescription`); debounced onChange to limit notify churn.
6. **Surfaces:** Epic detail header (default variant), Story/Epic inspectors (compact variant).
