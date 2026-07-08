/** True when pathname is a single Epic detail route (not the epics list). */
export function isEpicDetailRoute(pathname: string): boolean {
  return /\/workspace\/epics\/[^/]+$/.test(pathname);
}
