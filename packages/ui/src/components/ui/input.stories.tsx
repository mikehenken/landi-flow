import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';

/** Text input with Linear-style transparent background and focus ring. */
const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: 'Story title',
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: 'Implement command palette shell',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
};

export const EpicName: Story = {
  args: {
    placeholder: 'Epic name',
    'aria-label': 'Epic name',
  },
};
