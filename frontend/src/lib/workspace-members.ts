import type { AssignableMember } from '@landi-flow/core/types';

import type { PickerMember } from '@landi-flow/ui';

import {
  MOCK_ASSIGNABLE_MEMBERS,
  MOCK_WORKSPACE_AGENTS,
  MOCK_WORKSPACE_HUMANS,
} from '@/lib/agents/mock-roster';

import { isMockAuthEnabled } from '@/lib/agents/roster-client';

import type { AgentPresence } from '@/lib/agent-roster';

/**
 * @deprecated Use `useAssignableMembers()` — live roster from `list_assignable_members`.
 * Static exports remain for mock-auth-only fallbacks and unit tests.
 */
export const WORKSPACE_MEMBERS: AssignableMember[] = isMockAuthEnabled()
  ? MOCK_ASSIGNABLE_MEMBERS
  : [];

/** @deprecated Use `useAssignableMembers().pickerMembers` */
export const PICKER_MEMBERS: PickerMember[] = WORKSPACE_MEMBERS.map((member) => ({
  kind: member.kind,
  id: member.id,
  name: member.name,
  avatar_url: member.avatar_url,
  presence: member.presence,
  subtitle: member.subtitle,
  runtime: member.runtime ?? undefined,
  vendor: member.vendor ?? undefined,
  connection_state: member.connection_state ?? undefined,
  is_builtin: member.is_builtin,
}));

/** @deprecated Mock-only — use live roster hook in UI */
export const WORKSPACE_AGENTS: AssignableMember[] = isMockAuthEnabled()
  ? MOCK_WORKSPACE_AGENTS
  : [];

/** @deprecated Mock-only — use live roster hook in UI */
export const WORKSPACE_HUMANS: AssignableMember[] = isMockAuthEnabled()
  ? MOCK_WORKSPACE_HUMANS
  : [];

/** @deprecated Use `useAssignableMembers().getMemberById` */
export function getMemberById(id: string | null | undefined): AssignableMember | undefined {
  if (!id) {
    return undefined;
  }
  return WORKSPACE_MEMBERS.find((member) => member.id === id);
}

/** @deprecated Use `useAssignableMembers().getHumanName` */
export function getHumanName(userId: string | null | undefined): string | null {
  if (!userId) {
    return null;
  }
  const member = WORKSPACE_MEMBERS.find((m) => m.kind === 'human' && m.id === userId);
  return member?.name ?? userId;
}

/** @deprecated Use `useAssignableMembers().getAgentName` */
export function getAgentName(agentId: string | null | undefined): string | null {
  if (!agentId) {
    return null;
  }
  const member = WORKSPACE_MEMBERS.find((m) => m.kind === 'agent' && m.id === agentId);
  return member?.name ?? agentId;
}

export type { AgentPresence };
