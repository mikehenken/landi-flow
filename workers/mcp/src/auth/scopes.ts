/**
 * OAuth / MCP scope model (least privilege). Two orthogonal axes are enforced:
 * capability scopes (below) and RFC 8707 audience (`resource`). A read-only
 * credential can NEVER invoke a write tool regardless of scopes (tool-layer gate).
 *
 * `admin` is intentionally NOT grantable to actor=app credentials.
 */
export const MCP_SCOPES = {
  READ: 'read',
  WRITE: 'write',
  STORIES_CREATE: 'stories:create',
  STORIES_WRITE: 'stories:write',
  EPICS_CREATE: 'epics:create',
  EPICS_WRITE: 'epics:write',
  COMMENTS_CREATE: 'comments:create',
  SIGNALS_WRITE: 'signals:write',
  APP_ASSIGNABLE: 'app:assignable',
  APP_MENTIONABLE: 'app:mentionable',
} as const;

export type McpScope = (typeof MCP_SCOPES)[keyof typeof MCP_SCOPES];

export const ALL_MCP_SCOPES: string[] = Object.values(MCP_SCOPES);

/** Default scope grant for a freshly issued personal API key. */
export const DEFAULT_API_KEY_SCOPES: string[] = [
  MCP_SCOPES.READ,
  MCP_SCOPES.WRITE,
  MCP_SCOPES.STORIES_CREATE,
  MCP_SCOPES.STORIES_WRITE,
  MCP_SCOPES.EPICS_CREATE,
  MCP_SCOPES.EPICS_WRITE,
  MCP_SCOPES.COMMENTS_CREATE,
  MCP_SCOPES.SIGNALS_WRITE,
  MCP_SCOPES.APP_ASSIGNABLE,
  MCP_SCOPES.APP_MENTIONABLE,
];

/** Scopes that grant any write capability (used to gate read-only credentials). */
const WRITE_SCOPES = new Set<string>([
  MCP_SCOPES.WRITE,
  MCP_SCOPES.STORIES_CREATE,
  MCP_SCOPES.STORIES_WRITE,
  MCP_SCOPES.EPICS_CREATE,
  MCP_SCOPES.EPICS_WRITE,
  MCP_SCOPES.COMMENTS_CREATE,
  MCP_SCOPES.SIGNALS_WRITE,
]);

export function isWriteScope(scope: string): boolean {
  return WRITE_SCOPES.has(scope);
}

/** `admin` (any form) is disallowed for app credentials. */
export function sanitizeRequestedScopes(requested: string[]): string[] {
  const allowed = new Set(ALL_MCP_SCOPES);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const scope of requested) {
    const trimmed = scope.trim();
    if (!trimmed || trimmed === 'admin' || trimmed.startsWith('admin:')) {
      continue;
    }
    if (allowed.has(trimmed) && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result.length > 0 ? result : [MCP_SCOPES.READ];
}

export function parseScopeString(scope: string | null | undefined): string[] {
  if (!scope) {
    return [];
  }
  return scope.split(/\s+/).filter(Boolean);
}
