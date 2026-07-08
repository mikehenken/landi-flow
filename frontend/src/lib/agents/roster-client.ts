import type { AssignableMember } from '@landi-flow/core/types';
import { MOCK_ASSIGNABLE_MEMBERS } from '@/lib/agents/mock-roster';
import { isWorkspaceUuid } from '@/lib/workspace/is-workspace-uuid';

/** True when the dev shell bypasses Supabase auth and uses seed/mock data. */
export function isMockAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';
}

function parseMember(raw: unknown): AssignableMember | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const kind = row.kind;
  if (kind !== 'human' && kind !== 'agent') {
    return null;
  }
  const id = row.id;
  const name = row.name;
  if (typeof id !== 'string' || typeof name !== 'string') {
    return null;
  }
  const presence = row.presence;
  const validPresence =
    presence === 'online' ||
    presence === 'working' ||
    presence === 'idle' ||
    presence === 'offline'
      ? presence
      : 'offline';

  const runtime = row.runtime;
  const parsedRuntime =
    runtime === 'native' || runtime === 'external_mcp' || runtime === 'attribution_only'
      ? runtime
      : null;

  const connectionState = row.connection_state;
  const parsedConnection =
    connectionState === 'connected' ||
    connectionState === 'disconnected' ||
    connectionState === 'never_connected'
      ? connectionState
      : null;

  let capabilities: string[] = [];
  if (Array.isArray(row.capabilities)) {
    capabilities = row.capabilities.filter((c): c is string => typeof c === 'string');
  }

  return {
    kind,
    id,
    name,
    avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    assignable: row.assignable !== false,
    mentionable: row.mentionable !== false,
    presence: validPresence,
    subtitle: typeof row.subtitle === 'string' ? row.subtitle : null,
    runtime: parsedRuntime,
    vendor: typeof row.vendor === 'string' ? row.vendor : null,
    connection_state: parsedConnection,
    is_builtin: row.is_builtin === true,
    capabilities,
    developer_discrepancy: row.developer_discrepancy === true,
  };
}

export function parseAssignableMembers(payload: unknown): AssignableMember[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload
    .map((row) => parseMember(row))
    .filter((member): member is AssignableMember => member !== null);
}

/**
 * Fetch the unified assignable roster for a workspace.
 * Mock fallback ONLY when `NEXT_PUBLIC_MOCK_AUTH=true` (documented in AGENTS.md).
 */
export async function fetchAssignableMembers(workspaceId: string): Promise<AssignableMember[]> {
  if (isMockAuthEnabled()) {
    return MOCK_ASSIGNABLE_MEMBERS;
  }

  // Safety net: the roster RPC is keyed by a uuid workspace id. Refuse to fire
  // with an unresolved demo/host id (e.g. `ws-landi-flow-demo`) so we never
  // trigger `invalid input syntax for type uuid`. Callers should wait for
  // `ActiveWorkspaceProvider` to resolve the real workspace uuid first.
  if (!isWorkspaceUuid(workspaceId)) {
    throw new Error(
      'Workspace is not resolved yet (non-uuid workspace id); retry once the workspace loads.',
    );
  }

  const response = await fetch(
    `/api/members/list?workspace_id=${encodeURIComponent(workspaceId)}`,
    { credentials: 'same-origin' },
  );
  if (!response.ok) {
    throw new Error(`Failed to load assignable members (${response.status})`);
  }
  const data = (await response.json()) as { members?: unknown };
  return parseAssignableMembers(data.members ?? []);
}

export function getMemberByIdFromMembers(
  members: AssignableMember[],
  id: string | null | undefined,
): AssignableMember | undefined {
  if (!id) {
    return undefined;
  }
  return members.find((member) => member.id === id);
}

export function getHumanNameFromMembers(
  members: AssignableMember[],
  userId: string | null | undefined,
): string | null {
  if (!userId) {
    return null;
  }
  const member = members.find((m) => m.kind === 'human' && m.id === userId);
  return member?.name ?? userId;
}

export function getAgentNameFromMembers(
  members: AssignableMember[],
  agentId: string | null | undefined,
): string | null {
  if (!agentId) {
    return null;
  }
  const member = members.find((m) => m.kind === 'agent' && m.id === agentId);
  return member?.name ?? agentId;
}

export function getBuiltinAgent(members: AssignableMember[]): AssignableMember | undefined {
  return members.find((m) => m.kind === 'agent' && m.is_builtin === true);
}

export function getChatCapableAgents(members: AssignableMember[]): AssignableMember[] {
  return members.filter(
    (m) =>
      m.kind === 'agent' &&
      (m.runtime === 'native' || m.runtime === 'external_mcp'),
  );
}

export function getDelegateAttributionLabel(member: AssignableMember | undefined): string | null {
  if (!member || member.kind !== 'agent') {
    return null;
  }
  if (member.runtime === 'attribution_only') {
    return `Attributed to ${member.name}`;
  }
  if (
    member.runtime === 'external_mcp' &&
    member.connection_state === 'connected'
  ) {
    return 'Active delegate';
  }
  if (member.runtime === 'native') {
    return `${member.name} proposes writes via Handoff Queue`;
  }
  if (member.runtime === 'external_mcp') {
    return `${member.name} — connect via MCP in Settings for live IDE sessions`;
  }
  return null;
}
