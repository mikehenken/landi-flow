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
  { id: 'create-story', label: 'Create Story', shortcut: 'C', group: 'Suggested Actions' },
  { id: 'create-epic', label: 'Create Epic', group: 'Suggested Actions' },
  { id: 'go-inbox', label: 'Go to Inbox', shortcut: 'G I', group: 'Navigation' },
  { id: 'go-epics', label: 'Go to Epics', shortcut: 'G E', group: 'Navigation' },
];

const demoStories = [
  { id: 'story-1', identifier: 'LAN-1', title: 'Command palette search scope' },
  { id: 'story-2', identifier: 'LAN-2', title: 'Epic board drag-and-drop' },
  { id: 'story-3', identifier: 'LAN-3', title: 'Agent delegate workflow' },
];

const demoEpics = [
  { id: 'epic-1', name: 'Discoverability' },
  { id: 'epic-2', name: 'Collaboration' },
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
        stories={demoStories}
        epics={demoEpics}
        groupLabels={{ stories: 'Stories', epics: 'Epics' }}
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
          stories={demoStories}
          epics={demoEpics}
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
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        actions={actions}
        stories={demoStories}
        epics={demoEpics}
      />
    );
  },
};
