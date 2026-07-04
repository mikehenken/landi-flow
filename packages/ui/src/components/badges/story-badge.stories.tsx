import type { Meta, StoryObj } from '@storybook/react';
import {
  StoryBadge,
  StoryIdentifierBadge,
  StoryPriorityBadge,
} from './story-badge';

/** Story badges — HITM: Story replaces Issue in UI. */
const meta: Meta<typeof StoryBadge> = {
  title: 'Domain/StoryBadge',
  component: StoryBadge,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StoryBadge>;

export const Todo: Story = {
  args: {
    title: 'Add command palette shell',
    status: 'todo',
  },
};

export const InProgress: Story = {
  args: {
    title: 'Implement sidebar navigation',
    status: 'in_progress',
    showLabel: true,
  },
};

export const Done: Story = {
  args: {
    title: 'Configure brand tokens',
    status: 'done',
  },
};

export const BoardRow: Story = {
  render: () => (
    <div className="flex w-[320px] items-center gap-2 rounded-lg border border-border bg-surface-elevated p-3">
      <StoryIdentifierBadge identifier="LAN-42" />
      <StoryBadge title="Implement shared design system" status="in_progress" />
      <StoryPriorityBadge priority="high" />
    </div>
  ),
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StoryBadge title="Todo Story" status="todo" />
      <StoryBadge title="Active Story" status="in_progress" />
      <StoryBadge title="Done Story" status="done" />
      <StoryBadge title="Canceled Story" status="canceled" />
    </div>
  ),
};

export const Priorities: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StoryPriorityBadge priority="none" />
      <StoryPriorityBadge priority="low" />
      <StoryPriorityBadge priority="medium" />
      <StoryPriorityBadge priority="high" />
      <StoryPriorityBadge priority="urgent" />
    </div>
  ),
};
