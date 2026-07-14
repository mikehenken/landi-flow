import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

/**
 * Compact, keyboard-accessible buttons with Landi Flow brand styling.
 * Primary actions use `--brand-primary` (#5e6ad2).
 */
const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'ghost', 'destructive', 'outline', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: 'Create Story',
    variant: 'default',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Create Epic',
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Cancel',
    variant: 'ghost',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Delete Epic',
    variant: 'destructive',
  },
};

export const Small: Story = {
  args: {
    children: 'Save',
    size: 'sm',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
};
