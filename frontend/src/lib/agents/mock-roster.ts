/**
 * Mock assignable roster — used ONLY when `NEXT_PUBLIC_MOCK_AUTH=true`.
 * Production paths fetch live data via `list_assignable_members` RPC / `/api/members/list`.
 */
import type { AssignableMember } from '@landi-flow/core/types';

/** Stable mock id for the built-in Landi Flow Agent (mirrors DB deterministic id semantics). */
export const MOCK_BUILTIN_LANDI_FLOW_AGENT_ID = 'agent-landi-flow-builtin';

export const MOCK_WORKSPACE_HUMANS: AssignableMember[] = [
  {
    kind: 'human',
    id: 'user-jane',
    name: 'Jane Doe',
    avatar_url: null,
    assignable: true,
    mentionable: true,
    presence: 'online',
    subtitle: 'owner',
    runtime: null,
    vendor: null,
    connection_state: null,
    is_builtin: false,
    capabilities: [],
  },
  {
    kind: 'human',
    id: 'user-alex',
    name: 'Alex Kim',
    avatar_url: null,
    assignable: true,
    mentionable: true,
    presence: 'idle',
    subtitle: 'member',
    runtime: null,
    vendor: null,
    connection_state: null,
    is_builtin: false,
    capabilities: [],
  },
];

export const MOCK_WORKSPACE_AGENTS: AssignableMember[] = [
  {
    kind: 'agent',
    id: MOCK_BUILTIN_LANDI_FLOW_AGENT_ID,
    name: 'Landi Flow Agent',
    avatar_url: null,
    assignable: true,
    mentionable: true,
    presence: 'idle',
    subtitle: 'Landi Flow',
    runtime: 'native',
    vendor: 'Landi Flow',
    connection_state: 'connected',
    is_builtin: true,
    capabilities: ['inbox_triage', 'story_draft', 'epic_summary', 'agent_console'],
  },
  {
    kind: 'agent',
    id: 'agent-cursor-external',
    name: 'Cursor Agent',
    avatar_url: null,
    assignable: true,
    mentionable: true,
    presence: 'offline',
    subtitle: 'Cursor',
    runtime: 'external_mcp',
    vendor: 'Cursor',
    connection_state: 'disconnected',
    is_builtin: false,
    capabilities: ['mcp_tools', 'ide_session'],
  },
  {
    kind: 'agent',
    id: 'agent-attribution-demo',
    name: 'Offline Attribution',
    avatar_url: null,
    assignable: true,
    mentionable: true,
    presence: 'offline',
    subtitle: 'Custom',
    runtime: 'attribution_only',
    vendor: 'Custom',
    connection_state: 'never_connected',
    is_builtin: false,
    capabilities: [],
    developer_discrepancy: true,
  },
];

export const MOCK_ASSIGNABLE_MEMBERS: AssignableMember[] = [
  ...MOCK_WORKSPACE_HUMANS,
  ...MOCK_WORKSPACE_AGENTS,
];
