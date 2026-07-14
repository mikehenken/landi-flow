import type { Meta, StoryObj } from '@storybook/react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

/**
 * Human avatars are circles; agent avatars are squircles (MCP-IDE-001).
 */
const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    actorType: {
      control: 'radio',
      options: ['human', 'agent'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Human: Story = {
  render: () => (
    <Avatar actorType="human" fallback="JD">
      <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jane" alt="Jane Doe" />
      <AvatarFallback actorType="human">JD</AvatarFallback>
    </Avatar>
  ),
};

export const Agent: Story = {
  render: () => (
    <Avatar actorType="agent" fallback="CU">
      <AvatarFallback actorType="agent">CU</AvatarFallback>
    </Avatar>
  ),
};

export const AgentActive: Story = {
  render: () => (
    <Avatar actorType="agent" active fallback="CC">
      <AvatarFallback actorType="agent">CC</AvatarFallback>
    </Avatar>
  ),
};

export const SizeComparison: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Avatar actorType="human" size="xs" fallback="H" />
      <Avatar actorType="human" size="sm" fallback="H" />
      <Avatar actorType="human" size="default" fallback="H" />
      <Avatar actorType="human" size="lg" fallback="H" />
      <Avatar actorType="agent" size="default" active fallback="AI" />
    </div>
  ),
};
