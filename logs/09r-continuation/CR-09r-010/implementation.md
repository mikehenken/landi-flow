# CR-09r-010 Implementation Log

**Date:** 2026-07-06  
**Scope:** Command palette search scope (CAP-038/039) — searchable Stories + Epics alongside action groups

## Summary

Extended the Cmd/Ctrl+K command palette from action-only navigation to Linear/Shortcut-style unified search across Stories, Epics, and command actions.

## CommandPalette (`packages/ui/src/components/command/command-palette.tsx`)

### New types
- `CommandPaletteStoryResult` — `id`, `identifier`, `title`, `onSelect`
- `CommandPaletteEpicResult` — `id`, `name`, `onSelect`
- `CommandPaletteGroupLabels` — optional `stories` / `epics` headings

### New props
- `stories?: CommandPaletteStoryResult[]`
- `epics?: CommandPaletteEpicResult[]`
- `groupLabels?: CommandPaletteGroupLabels`
- `emptyMessage?: string`

### Rendering order
1. **Stories** — `StoryIdentifierBadge` + title; cmdk `value`/`keywords` on identifier + title
2. **Epics** — Layers icon + name
3. **Action groups** — existing grouped navigation / suggested actions (unchanged behavior)

cmdk handles client-side filtering as the user types; empty state uses configurable `emptyMessage`.

## App shell wiring (`frontend/src/components/app-shell.tsx`)

- Maps `useStoryStore().stories` → `commandStories`
- Maps `useEpicStore().epics` → `commandEpics`
- **Story select:** `storyStore.selectStory(id)` + navigate `/workspace/stories`
- **Epic select:** `epicStore.selectEpic(id)` + navigate `/workspace/epics/{id}`
- **Create Story action:** unchanged — still opens `CreateStoryModal` via `openCreateStory`

## i18n (`packages/ui/src/i18n/messages/*/navigation.json`)

Added keys (en/de/es/ar):
- `command_palette.stories_group`
- `command_palette.epics_group`
- `command_palette.placeholder`
- `command_palette.no_results`

## Exports

- `packages/ui/src/index.ts` — exports new result/group label types

## Storybook

- `command-palette.stories.tsx` — demo stories/epics alongside actions

## Files changed

| File | Change |
|------|--------|
| `packages/ui/src/components/command/command-palette.tsx` | Stories/Epics search groups + types |
| `packages/ui/src/components/command/command-palette.stories.tsx` | Demo data for search groups |
| `packages/ui/src/index.ts` | Export new types |
| `packages/ui/src/i18n/messages/en/navigation.json` | Group headings + placeholder |
| `packages/ui/src/i18n/messages/de/navigation.json` | Group headings + placeholder |
| `packages/ui/src/i18n/messages/es/navigation.json` | Group headings + placeholder |
| `packages/ui/src/i18n/messages/ar/navigation.json` | Group headings + placeholder |
| `frontend/src/components/app-shell.tsx` | Wire stores → palette props + select handlers |

## Lint / validation

```
pnpm --filter @landi-flow/ui lint
✔ tsc --noEmit (no errors)

pnpm --filter @landi-flow/frontend lint
✔ No ESLint warnings or errors
```

## Self-review

- [x] Cmd/Ctrl+K opens palette with Stories, Epics, and action groups (not action-only stub)
- [x] Stories searchable by identifier + title (cmdk value/keywords)
- [x] Epics searchable by name
- [x] Story select → stories view + `storyStore.selectStory(id)`
- [x] Epic select → epic detail + `epicStore.selectEpic(id)`
- [x] Create Story action still opens modal (not removed)
- [x] Epic terminology preserved (never Project)
- [x] i18n for group headings in all four locales
- [x] No features removed from existing action groups
- [x] Lint clean on edited packages

## Follow-ups (out of scope)

- E2E test asserting story/epic search result selection
- Recent/frecency-ranked results when query is empty (Linear shows recents first)
