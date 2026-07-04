import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';

/** Status and label chips with semantic color variants. */
const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: { children: 'Badge' },
};

export const StatusTodo: Story = {
  args: { children: 'Todo', variant: 'statusTodo' },
};

export const StatusInProgress: Story = {
  args: { children: 'In Progress', variant: 'statusInProgress' },
};

export const StatusDone: Story = {
  args: { children: 'Done', variant: 'statusDone' },
};

export const Destructive: Story = {
  args: { children: 'Error', variant: 'destructive' },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="statusTodo">Todo</Badge>
      <Badge variant="statusInProgress">In Progress</Badge>
      <Badge variant="statusDone">Done</Badge>
      <Badge variant="statusWarning">Warning</Badge>
      <Badge variant="destructive">Error</Badge>
    </div>
  ),
};
