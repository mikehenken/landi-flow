import type { Meta, StoryObj } from '@storybook/react';
import { EpicBadge, EpicIdentifierBadge } from './epic-badge';

/** Epic badges — HITM: Epic replaces Project globally. */
const meta: Meta<typeof EpicBadge> = {
  title: 'Domain/EpicBadge',
  component: EpicBadge,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EpicBadge>;

export const Backlog: Story = {
  args: {
    name: 'Q2 Platform Launch',
    status: 'backlog',
  },
};

export const InProgress: Story = {
  args: {
    name: 'Design System Foundation',
    status: 'in_progress',
    showLabel: true,
  },
};

export const Completed: Story = {
  args: {
    name: 'MCP Integration',
    status: 'completed',
  },
};

export const WithIdentifier: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <EpicIdentifierBadge epicId="EPI-12" />
      <EpicBadge name="Agent Observability" status="in_progress" />
    </div>
  ),
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <EpicBadge name="Backlog Epic" status="backlog" />
      <EpicBadge name="Planned Epic" status="planned" />
      <EpicBadge name="Active Epic" status="in_progress" />
      <EpicBadge name="Done Epic" status="completed" />
      <EpicBadge name="Cancelled Epic" status="cancelled" />
    </div>
  ),
};
