# CR-09r-011 Implementation Log

**Date:** 2026-07-06  
**Scope:** Configurable entity terminology (agency/workspace defaults)

## Summary

Workspace/agency `settings.terminology` overrides default Story/Epic/Workspace labels. UI reads resolved labels through `TerminologyProvider` and `useTerminology()`.

## Core schema (`packages/core/src/types/workspace-settings.ts`)

### New types
- `WorkspaceTerminologySettings` — optional `story`, `stories`, `epic`, `epics`, `workspace` string overrides
- Added `terminology?: WorkspaceTerminologySettings` to `WorkspaceSettings`

### Parser
- `parseWorkspaceSettings()` now parses `settings.terminology` with trimmed non-empty strings
- Invalid/empty terminology objects return `undefined`

### Tests
- Added terminology parse + empty-string rejection cases in `workspace-settings.test.ts`

## Terminology provider (`packages/ui/src/i18n/terminology/`)

### `TerminologyProvider`
- Props: `terminology?: WorkspaceTerminologySettings`
- Merges workspace overrides with `entity` i18n namespace defaults
- Must render inside `NextIntlClientProvider`

### `useTerminology()`
- Returns `{ labels, t }` where `t('entity.story')`, `t('entity.epics')`, etc. resolve merged labels
- `useTerminologyOptional()` for Storybook/auth edge cases

## i18n

### New namespace: `entity.json` (en/de/es/ar)
- Default keys: `story`, `stories`, `epic`, `epics`, `workspace`

### Navigation/common additions
- `common.actions.create` — verb prefix for create buttons
- `navigation.command_palette.goto_prefix` — "Go to" prefix
- `navigation.command_palette.search_placeholder` — `{stories}`, `{epics}` interpolation
- `navigation.views.stories_nav` — `My {stories}` pattern
- `navigation.views.entity_board` — `{entity} Board` pattern

## Workspace seed (`frontend/src/lib/workspace/registry.ts`)

**Acme Agency** demo workspace includes terminology overrides:
- story → Task, stories → Tasks
- epic → Initiative, epics → Initiatives
- workspace → Organization

## Wiring

### Layout (`frontend/src/app/[locale]/layout.tsx`)
```tsx
<WorkspaceProvider workspace={workspace}>
  <TerminologyProvider terminology={workspace.parsedSettings.terminology}>
    ...
  </TerminologyProvider>
</WorkspaceProvider>
```

### App shell (`frontend/src/components/app-shell.tsx`)
- Create button: `Create ${tEntity('entity.story')}`
- Sidebar epics section title: `tEntity('entity.epics')`
- Sidebar nav: `stories_nav`, `entity_board` with resolved entity labels
- Command palette: create/goto actions, group headings, search placeholder

## Exports

- `packages/ui/src/index.ts` — `TerminologyProvider`, `useTerminology`, types
- `packages/core/src/types/index.ts` — `WorkspaceTerminologySettings`

## Verification

```bash
pnpm run lint
pnpm test packages/core/src/types/workspace-settings.test.ts
```

## Acceptance checklist

- [x] `settings.terminology` schema in core with parser
- [x] TerminologyProvider resolves workspace overrides + i18n fallbacks
- [x] Workspace seed demonstrates configurable labels (Acme Agency)
- [x] App shell create button uses resolved labels
- [x] Sidebar epics section uses resolved labels
- [x] Command palette groups/actions/placeholder use resolved labels
- [x] story, epic, workspace entity labels configurable at minimum

## Follow-ups (out of scope)

- Settings UI to edit terminology (placeholder text already references it)
- Agency-level franchise defaults (IDEA-006)
- Remaining pages: inbox welcome, story inspector, create modal, page titles
