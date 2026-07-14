/**
 * Routes where story detail modal / selection should remain active.
 * Shared by StoryDetailModalHost and unit tests.
 */

const STORY_DETAIL_ROUTES = ['/workspace/stories', '/workspace/stories/board'] as const;

/** Epic detail (and nested tabs) must keep story selection — list clicks open the modal. */
const EPIC_DETAIL_ROUTE = '/workspace/epics';

export const STORY_MODAL_ROUTES = [
  ...STORY_DETAIL_ROUTES,
  '/workspace/stories/drafts',
  '/workspace/inbox',
  '/workspace/my-issues',
  EPIC_DETAIL_ROUTE,
] as const;

export const STORY_SELECTION_PRESERVE_ROUTES = [
  ...STORY_DETAIL_ROUTES,
  '/workspace/stories/drafts',
  '/workspace/inbox',
  '/workspace/my-issues',
  EPIC_DETAIL_ROUTE,
] as const;

export function pathMatchesRoute(pathname: string, route: string): boolean {
  if (!pathname || pathname === '/') {
    return false;
  }
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return (
    normalizedPath === route ||
    normalizedPath.startsWith(`${route}/`) ||
    normalizedPath.includes(route)
  );
}

export function isStoryModalRoute(pathname: string): boolean {
  return STORY_MODAL_ROUTES.some((route) => pathMatchesRoute(pathname, route));
}

export function preservesStorySelection(pathname: string): boolean {
  // Avoid clearing selection during transient empty pathnames while the router settles.
  if (!pathname || pathname === '/') {
    return true;
  }
  return STORY_SELECTION_PRESERVE_ROUTES.some((route) => pathMatchesRoute(pathname, route));
}
