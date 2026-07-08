# CR-09r-015 Implementation Log

**Date:** 2026-07-06  
**Scope:** Responsive/mobile layout pass on workspace shell (375px target)

## Summary

Applied highest-impact responsive fixes to the workspace shell and primary views so sidebar collapses on mobile, header actions stack without horizontal overflow, Kanban columns scroll in-container, and list/search surfaces use full width at narrow viewports.

## Acceptance criteria

| Criterion | Status | Notes |
|-----------|--------|-------|
| Sidebar collapses | **PASS** | Default collapsed; auto-collapse + inspector close on `<640px` |
| Board/list usable at 375px | **PASS** | Board columns 240px min with contained horizontal scroll; list padding reduced |
| No horizontal overflow on primary actions | **PASS** | Header stacks; search flexes; create icon-only on mobile; breadcrumbs hidden `<sm` |

## 1. SidebarLayout (`packages/ui/src/components/sidebar/sidebar.tsx`)

- Header: responsive padding (`px-4 sm:px-6`), `min-h-12` with wrap room on mobile
- Main: added `min-w-0` to prevent flex child overflow
- Inspector panel: `hidden lg:block` — right properties panel only on large screens

## 2. App shell header (`frontend/src/components/app-shell.tsx`)

- New `useIsMobile()` hook drives mobile behavior
- Sidebar default **collapsed** (`useState(true)`)
- On mobile: force sidebar collapsed + close inspector
- Header layout: column on mobile, row on `sm+`
- Breadcrumbs: `hidden sm:block` (avoids overflow)
- Search trigger: flex-1 on mobile, icon + truncated label; `⌘K` badge hidden `<sm`
- Presence lobby: hidden `<sm`
- Create Story: `Plus` icon on mobile, full label on `sm+`

## 3. Board view (`frontend/src/components/collaboration/collaborative-board.tsx`)

- Scroll container: `min-w-0 overflow-x-auto overscroll-x-contain` with tighter mobile padding
- Columns: `w-[240px] shrink-0` on mobile, `sm:min-w-[280px] sm:flex-1` on desktop
- Applied to both offline and live (`BoardInner`) board paths

## 4. Customers / stories list

**Customers** (`frontend/src/components/customers-view.tsx`):
- Search bar full width on mobile (`w-full flex-1`; `max-w-xl` only `sm+`)
- Toolbar stacks below search on mobile
- Customer domain hidden `<sm` to prevent row overflow

**Stories list** (`frontend/src/components/story-list-view.tsx`):
- Row padding `px-4 sm:px-6`, tighter gap on mobile

## 5. Command palette

No changes — already uses responsive `max-w` and hidden shortcut hints on mobile.

## 6. Story detail modal (`frontend/src/components/story-detail-panel.tsx`)

- Mobile: full viewport height/width (`h-full w-full max-w-none`)
- Desktop: preserved centered panel sizing (`sm:h-[min(720px,...)]`, `sm:max-w-2xl`)
- Backdrop wrapper: `justify-stretch` on mobile, `sm:justify-end` on desktop

## New file

| File | Purpose |
|------|---------|
| `frontend/src/hooks/use-media-query.ts` | `useMediaQuery` + `useIsMobile` (`max-width: 639px`) |

## Files changed

| File | Change |
|------|--------|
| `packages/ui/src/components/sidebar/sidebar.tsx` | Responsive header/main/inspector |
| `frontend/src/hooks/use-media-query.ts` | Mobile breakpoint hook |
| `frontend/src/components/app-shell.tsx` | Collapsed sidebar, stacked header, mobile inspector |
| `frontend/src/components/collaboration/collaborative-board.tsx` | Contained board scroll + column widths |
| `frontend/src/components/customers-view.tsx` | Full-width search, responsive list |
| `frontend/src/components/story-list-view.tsx` | Responsive row padding |
| `frontend/src/components/story-detail-panel.tsx` | Full-viewport modal on mobile |

## Lint / validation

```
pnpm --filter @landi-flow/ui lint
✔ tsc --noEmit (no errors)

pnpm --filter @landi-flow/frontend lint
✔ No ESLint warnings or errors
```

## Self-review

- [x] Sidebar collapsed by default and auto-collapses on mobile
- [x] Inspector hidden on `<lg` (modal/sidebar detail still available via story layout modes)
- [x] Header primary actions fit 375px without horizontal page scroll
- [x] Board horizontal scroll contained within main content area
- [x] Customers search uses full width on mobile
- [x] Story detail modal fills viewport on mobile
- [x] Lint clean on `@landi-flow/ui` and `@landi-flow/frontend`

## Residual (non-blocking)

- Secondary pages (settings, agents, epics) inherit shell fixes but were not individually tuned
- Story list has no search field (only customers); list rows optimized via padding only
- Desktop users who resize to mobile lose inspector open state until they re-open on `lg+`
