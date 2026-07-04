import type { Meta, StoryObj } from '@storybook/react';
import { Inbox, Layers, ListTodo } from 'lucide-react';
import { Sidebar, SidebarLayout } from './sidebar';
import { Button } from '../ui/button';

/** 240px left navigation shell with Epic/Story nomenclature. */
const meta: Meta<typeof Sidebar> = {
  title: 'Layout/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

const defaultSections = [
  {
    id: 'main',
    items: [
      { id: 'inbox', label: 'Inbox', icon: <Inbox className="h-4 w-4" />, active: true },
      { id: 'my-stories', label: 'My Stories', icon: <ListTodo className="h-4 w-4" /> },
    ],
  },
  {
    id: 'workspace',
    title: 'Workspace',
    items: [
      { id: 'epics', label: 'Epics', icon: <Layers className="h-4 w-4" />, shortcutHint: 'G E' },
    ],
  },
];

export const Default: Story = {
  render: () => (
    <div className="h-[480px]">
      <Sidebar
        workspaceName="Landi Flow"
        sections={defaultSections}
        footer={
          <p className="text-xs text-foreground-subtle">Powered by Landi Flow</p>
        }
      />
    </div>
  ),
};

export const Collapsed: Story = {
  render: () => (
    <div className="h-[480px]">
      <Sidebar workspaceName="Landi Flow" sections={defaultSections} collapsed />
    </div>
  ),
};

export const ThreePanelLayout: Story = {
  render: () => (
    <SidebarLayout
      sidebar={
        <Sidebar workspaceName="Acme Workspace" sections={defaultSections} />
      }
      header={
        <div className="flex w-full items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Design &gt; Epic &gt; <span className="text-foreground">LAN-42</span>
          </span>
          <Button size="sm">Create Story</Button>
        </div>
      }
      inspector={
        <div className="p-4">
          <p className="text-xs font-medium uppercase text-foreground-subtle">Properties</p>
          <p className="mt-2 text-sm">Status: In Progress</p>
        </div>
      }
    >
      <div className="p-8">
        <h1 className="text-xl font-semibold">Story list</h1>
      </div>
    </SidebarLayout>
  ),
};

export const WhiteLabelLogo: Story = {
  render: () => (
    <div className="h-[480px]">
      <Sidebar
        workspaceName="Agency Client"
        logoUrl="https://placehold.co/32x32/5e6ad2/ffffff?text=A"
        sections={defaultSections}
      />
    </div>
  ),
};
