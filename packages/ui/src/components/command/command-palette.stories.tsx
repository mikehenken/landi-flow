import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { CommandPalette, CommandPaletteTrigger } from './command-palette';

/** Cmd/Ctrl+K command palette shell for keyboard-first navigation. */
const meta: Meta<typeof CommandPalette> = {
  title: 'Layout/CommandPalette',
  component: CommandPalette,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CommandPalette>;

const defaultActions = [
  { id: 'create-story', label: 'Create Story', shortcut: 'C', group: 'Actions' },
  { id: 'create-epic', label: 'Create Epic', group: 'Actions' },
  { id: 'go-inbox', label: 'Go to Inbox', shortcut: 'G I', group: 'Navigation' },
  { id: 'go-epics', label: 'Go to Epics', shortcut: 'G E', group: 'Navigation' },
];

function CommandPaletteDemo(): React.ReactElement {
  const [open, setOpen] = React.useState(true);
  return (
    <>
      <CommandPaletteTrigger onOpen={() => setOpen(true)} />
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        actions={defaultActions}
      />
    </>
  );
}

export const Open: Story = {
  render: () => <CommandPaletteDemo />,
};

export const Closed: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false);
    return (
      <>
        <CommandPaletteTrigger onOpen={() => setOpen(true)} />
        <CommandPalette
          open={open}
          onOpenChange={setOpen}
          actions={defaultActions}
        />
      </>
    );
  },
};

export const WithManyActions: Story = {
  render: () => {
    const [open, setOpen] = React.useState(true);
    const actions = [
      ...defaultActions,
      { id: 'set-status', label: 'Set Status', shortcut: 'S', group: 'Story' },
      { id: 'set-assignee', label: 'Set Assignee', shortcut: 'A', group: 'Story' },
      { id: 'set-label', label: 'Set Label', shortcut: 'L', group: 'Story' },
    ];
    return (
      <CommandPalette open={open} onOpenChange={setOpen} actions={actions} />
    );
  },
};
