const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * True when a workspace id is a real Postgres `uuid` (a resolved workspace),
 * as opposed to a host/demo-derived id such as `ws-landi-flow-demo`.
 *
 * Callers that hit uuid-typed columns/RPCs (e.g. `list_assignable_members`,
 * store hydration) must wait for a resolved id before firing, otherwise
 * Supabase rejects the request with `invalid input syntax for type uuid`.
 */
export function isWorkspaceUuid(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}
