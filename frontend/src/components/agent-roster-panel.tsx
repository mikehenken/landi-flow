'use client';



import * as React from 'react';

import { Avatar, AvatarFallback, Badge, cn, useTranslations } from '@landi-flow/ui';

import {

  assignableMemberToWorkspaceAgent,

  PRESENCE_LABEL,

  type AgentPresence,

  type WorkspaceAgent,

} from '@/lib/agent-roster';

import { getChatCapableAgents } from '@/lib/agents/roster-client';

import { useAssignableMembers } from '@/hooks/use-assignable-members';



const PRESENCE_DOT: Record<AgentPresence, string> = {

  online: 'bg-status-done',

  working: 'bg-status-inProgress',

  idle: 'bg-status-todo',

  offline: 'bg-status-canceled',

};



export interface AgentRosterPanelProps {

  selectedAgentId: string;

  onSelectAgent: (agent: WorkspaceAgent) => void;

}



/**

 * Workspace collaborators — humans AND agents from live roster. Agents render

 * with squircle avatars and connection/runtime badges (task-09l pivot).

 */

export function AgentRosterPanel({

  selectedAgentId,

  onSelectAgent,

}: AgentRosterPanelProps): React.ReactElement {

  const tAgents = useTranslations('agents');

  const { members, loading } = useAssignableMembers();



  const chatAgents = React.useMemo(

    () => getChatCapableAgents(members).map(assignableMemberToWorkspaceAgent),

    [members],

  );

  const humans = React.useMemo(

    () => members.filter((member) => member.kind === 'human'),

    [members],

  );



  return (

    <div className="flex h-full flex-col overflow-y-auto">

      <div className="border-b border-border px-4 py-3">

        <h2 className="text-sm font-medium text-foreground">{tAgents('roster.title')}</h2>

        <p className="text-xs text-muted-foreground">

          Governed identities — native, MCP, or attribution-only

        </p>

      </div>



      {loading ? (

        <p className="px-4 py-3 text-xs text-muted-foreground">Loading roster…</p>

      ) : null}



      <RosterSection title={tAgents('roster.agents')}>

        {chatAgents.map((agent) => (

          <button

            key={agent.id}

            type="button"

            onClick={() => onSelectAgent(agent)}

            aria-current={agent.id === selectedAgentId ? 'true' : undefined}

            className={cn(

              'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors',

              agent.id === selectedAgentId ? 'bg-white/10' : 'hover:bg-white/5',

            )}

          >

            <div className="relative">

              <Avatar actorType="agent" size="default" active={agent.presence === 'working'}>

                <AvatarFallback actorType="agent">{agent.initials}</AvatarFallback>

              </Avatar>

              <PresenceDot presence={agent.presence} />

            </div>

            <div className="min-w-0 flex-1">

              <p className="truncate text-sm font-medium text-foreground">{agent.name}</p>

              <p className="truncate text-xs text-muted-foreground">

                {agent.focus ??

                  (agent.runtime === 'external_mcp' && agent.connection_state !== 'connected'

                    ? 'Connect via MCP in Settings'

                    : PRESENCE_LABEL[agent.presence])}

              </p>

            </div>

            <Badge variant={agent.is_builtin ? 'default' : 'secondary'} className="shrink-0 text-[10px]">

              {agent.is_builtin ? 'Built-in' : agent.runtime === 'native' ? 'Native' : 'MCP'}

            </Badge>

          </button>

        ))}

      </RosterSection>



      <RosterSection title={tAgents('roster.humans')}>

        {humans.map((human) => (

          <div key={human.id} className="flex w-full items-center gap-3 rounded-md px-2 py-2">

            <div className="relative">

              <Avatar actorType="human" size="default">

                <AvatarFallback actorType="human">

                  {human.name.slice(0, 2).toUpperCase()}

                </AvatarFallback>

              </Avatar>

              <PresenceDot presence={human.presence} />

            </div>

            <div className="min-w-0 flex-1">

              <p className="truncate text-sm font-medium text-foreground">{human.name}</p>

              <p className="truncate text-xs text-muted-foreground">

                {PRESENCE_LABEL[human.presence]}

              </p>

            </div>

          </div>

        ))}

      </RosterSection>

    </div>

  );

}



function RosterSection({

  title,

  children,

}: {

  title: string;

  children: React.ReactNode;

}): React.ReactElement {

  return (

    <div className="px-2 py-2">

      <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-foreground-subtle">

        {title}

      </p>

      <div className="space-y-0.5">{children}</div>

    </div>

  );

}



function PresenceDot({ presence }: { presence: AgentPresence }): React.ReactElement {

  return (

    <span

      className={cn(

        'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background',

        PRESENCE_DOT[presence],

      )}

      aria-label={PRESENCE_LABEL[presence]}

    />

  );

}


