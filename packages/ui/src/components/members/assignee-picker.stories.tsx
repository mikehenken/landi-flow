import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AssigneePicker, MemberChip, type PickerMember } from './assignee-picker';

/**
 * AssigneePicker — agents as FIRST-CLASS assignees (task-09k). Humans and AI agents
 * appear in one roster; picking a human fills the assignee/lead slot, picking an agent
 * fills the delegate slot. Agents render with the squircle avatar + a bot marker.
 */
const meta: Meta<typeof AssigneePicker> = {
  title: 'Members/AssigneePicker',
  component: AssigneePicker,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AssigneePicker>;

const HUMAN_JANE: PickerMember = {
  kind: 'human',
  id: 'user-jane',
  name: 'Jane Doe',
  presence: 'online',
  subtitle: 'owner',
};
const AGENT_CURSOR: PickerMember = {
  kind: 'agent',
  id: 'agent-cursor',
  name: 'Cursor Agent',
  presence: 'working',
  subtitle: 'Cursor (MCP)',
};

const MEMBERS: PickerMember[] = [
  HUMAN_JANE,
  { kind: 'human', id: 'user-alex', name: 'Alex Kim', presence: 'idle', subtitle: 'member' },
  AGENT_CURSOR,
  { kind: 'agent', id: 'agent-claude', name: 'Claude Code', presence: 'online', subtitle: 'Claude Code (MCP)' },
  { kind: 'agent', id: 'agent-triage', name: 'Triage Agent', presence: 'idle', subtitle: 'Landi Flow (native)' },
];

function Harness({
  initialHuman,
  initialAgent,
  humanLabel,
}: {
  initialHuman: string | null;
  initialAgent: string | null;
  humanLabel?: string;
}): React.ReactElement {
  const [humanId, setHumanId] = React.useState<string | null>(initialHuman);
  const [agentId, setAgentId] = React.useState<string | null>(initialAgent);
  return (
    <div style={{ width: 320 }}>
      <AssigneePicker
        members={MEMBERS}
        humanId={humanId}
        agentId={agentId}
        humanLabel={humanLabel}
        onSelectHuman={setHumanId}
        onSelectAgent={setAgentId}
      />
    </div>
  );
}

export const Unassigned: Story = {
  render: () => <Harness initialHuman={null} initialAgent={null} />,
};

export const HumanAssignee: Story = {
  render: () => <Harness initialHuman="user-jane" initialAgent={null} />,
};

export const AgentDelegate: Story = {
  render: () => <Harness initialHuman={null} initialAgent="agent-cursor" />,
};

export const HumanOwnsAgentActs: Story = {
  render: () => <Harness initialHuman="user-jane" initialAgent="agent-cursor" />,
};

export const EpicLead: Story = {
  render: () => <Harness initialHuman="user-alex" initialAgent="agent-triage" humanLabel="Lead" />,
};

export const Chips: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <MemberChip member={HUMAN_JANE} />
      <MemberChip member={AGENT_CURSOR} />
    </div>
  ),
};
