import type { AgentConnectionState, AgentRuntime, AssignableMember } from '@landi-flow/core/types';

import type { MessageAuthor } from '@landi-flow/ui';

import { MOCK_BUILTIN_LANDI_FLOW_AGENT_ID } from '@/lib/agents/mock-roster';



export type AgentPresence = 'online' | 'working' | 'idle' | 'offline';



/** Re-export stable built-in agent id (mock id in dev; DB uses deterministic uuid). */

export const BUILTIN_LANDI_FLOW_AGENT_ID = MOCK_BUILTIN_LANDI_FLOW_AGENT_ID;



/**

 * Agent Console roster entry — extends assignable member with chat UI fields.

 * Populated from live `list_assignable_members` data, not hardcoded demo personas.

 */

export interface WorkspaceAgent {

  id: string;

  name: string;

  /** Vendor label (Landi Flow, Cursor, …). */

  kind: string;

  initials: string;

  /** Default model when chatting in Agent Console (AI Gateway). */

  model: string;

  presence: AgentPresence;

  focus: string | null;

  runtime: AgentRuntime;

  vendor: string;

  connection_state: AgentConnectionState;

  is_builtin: boolean;

  capabilities: string[];

}



export interface WorkspaceHuman {

  id: string;

  name: string;

  initials: string;

  presence: AgentPresence;

}



export function initialsFromName(name: string): string {

  const parts = name.trim().split(/\s+/).filter(Boolean);

  const first = parts[0];

  if (!first) {

    return '?';

  }

  if (parts.length === 1) {

    return first.slice(0, 2).toUpperCase();

  }

  const last = parts[parts.length - 1] ?? first;

  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();

}



export function assignableMemberToWorkspaceAgent(member: AssignableMember): WorkspaceAgent {

  return {

    id: member.id,

    name: member.name,

    kind: member.vendor ?? member.subtitle ?? 'Agent',

    initials: initialsFromName(member.name),

    model: member.is_builtin ? 'gemini-2.5-flash' : 'gemini-2.5-flash',

    presence: member.presence,

    focus:

      member.is_builtin === true

        ? 'Watching the Inbox for untriaged Stories'

        : member.runtime === 'external_mcp' && member.connection_state !== 'connected'

          ? 'Connect via MCP in Settings'

          : null,

    runtime: member.runtime ?? 'external_mcp',

    vendor: member.vendor ?? member.subtitle ?? 'Agent',

    connection_state: member.connection_state ?? 'never_connected',

    is_builtin: member.is_builtin === true,

    capabilities: member.capabilities ?? [],

  };

}



export function getAgentByIdFromList(

  agents: WorkspaceAgent[],

  agentId: string,

): WorkspaceAgent | undefined {

  return agents.find((agent) => agent.id === agentId);

}



export function agentAsAuthor(agent: WorkspaceAgent): MessageAuthor {

  return {

    id: agent.id,

    name: agent.name,

    actorType: 'agent',

    initials: agent.initials,

  };

}



export const CURRENT_USER: MessageAuthor = {

  id: 'user-jane',

  name: 'You',

  actorType: 'human',

  initials: 'JD',

};



export const PRESENCE_LABEL: Record<AgentPresence, string> = {

  online: 'Online',

  working: 'Working',

  idle: 'Idle',

  offline: 'Offline',

};



export function agentConsoleDescription(agent: WorkspaceAgent): string {

  if (agent.runtime === 'native') {

    return 'Native in-app agent. Inference runs here; every write is proposed for Handoff Queue approval before apply.';

  }

  if (agent.runtime === 'external_mcp' && agent.connection_state !== 'connected') {

    return 'External MCP agent — not connected. Connect via MCP in Settings. In-app chat does not control your IDE remotely.';

  }

  if (agent.runtime === 'external_mcp') {

    return 'External MCP agent. Works in your IDE via OAuth; in-app chat uses native inference only — we never drive your IDE from the browser.';

  }

  return 'Agent identity for attribution. Assign as delegate without a live connection.';

}


