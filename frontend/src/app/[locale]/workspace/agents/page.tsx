'use client';



import * as React from 'react';

import { useTranslations } from '@landi-flow/ui';

import { AppShell } from '@/components/app-shell';

import { AgentChatPanel } from '@/components/agent-chat-panel';

import { AgentRosterPanel } from '@/components/agent-roster-panel';

import {

  assignableMemberToWorkspaceAgent,

  type WorkspaceAgent,

} from '@/lib/agent-roster';

import { getBuiltinAgent, getChatCapableAgents } from '@/lib/agents/roster-client';

import { useAssignableMembers } from '@/hooks/use-assignable-members';

import { useWorkspace } from '@/lib/workspace';



/**

 * Agent Console — native in-app agent chat + external MCP identity roster.

 * Does NOT imply remote IDE control from the web UI (task-09l architecture pivot).

 */

export default function WorkspaceAgentsPage(): React.ReactElement {

  const { workspace } = useWorkspace();

  const { members } = useAssignableMembers();

  const tNav = useTranslations('navigation');

  const tAgents = useTranslations('agents');



  const defaultAgent = React.useMemo((): WorkspaceAgent => {

    const builtin = getBuiltinAgent(members);

    if (builtin) {

      return assignableMemberToWorkspaceAgent(builtin);

    }

    const chatCapable = getChatCapableAgents(members);

    const first = chatCapable[0];

    if (first) {

      return assignableMemberToWorkspaceAgent(first);

    }

    const anyAgent = members.find((m) => m.kind === 'agent');
    if (anyAgent) {
      return assignableMemberToWorkspaceAgent(anyAgent);
    }
    return {
      id: 'agent-placeholder',
      name: 'Landi Flow Agent',
      kind: 'Landi Flow',
      initials: 'LF',
      model: 'gemini-2.5-flash',
      presence: 'idle',
      focus: null,
      runtime: 'native',
      vendor: 'Landi Flow',
      connection_state: 'connected',
      is_builtin: true,
      capabilities: [],
    };

  }, [members]);



  const [selectedAgent, setSelectedAgent] = React.useState<WorkspaceAgent>(defaultAgent);



  React.useEffect(() => {
    setSelectedAgent(defaultAgent);
  }, [defaultAgent]);



  return (

    <AppShell

      viewTitle={tAgents('console.title')}

      breadcrumbs={[tNav('views.workspace'), tNav('agents.breadcrumb')]}

      inspectorSlot={

        <AgentRosterPanel

          selectedAgentId={selectedAgent.id}

          onSelectAgent={(agent) => setSelectedAgent(agent)}

        />

      }

    >

      <AgentChatPanel agent={selectedAgent} workspaceId={workspace.id} />

    </AppShell>

  );

}


