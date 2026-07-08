import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CreateStoryModal } from './create-story-modal';
import { WorkspaceProvider } from '@/lib/workspace';
import { WORKSPACE_REGISTRY } from '@/lib/workspace/registry';
import { DEMO_WORKSPACE_ID } from '@/lib/seed-data';

/**
 * Create Story modal (CAP-004 / HITM `create_issue_modal`) — title, markdown
 * description, property chips (status, priority, epic), and Create more toggle.
 */
const meta: Meta<typeof CreateStoryModal> = {
  title: 'Layout/CreateStoryModal',
  component: CreateStoryModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => {
      const workspace =
        WORKSPACE_REGISTRY.find((entry) => entry.id === DEMO_WORKSPACE_ID) ??
        WORKSPACE_REGISTRY[0];
      if (!workspace) {
        throw new Error('Demo workspace missing from registry');
      }
      return (
        <WorkspaceProvider workspace={workspace}>
          <Story />
        </WorkspaceProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof CreateStoryModal>;

function ModalHarness({ initialOpen = true }: { initialOpen?: boolean }): React.ReactElement {
  const [open, setOpen] = React.useState(initialOpen);
  return (
    <div className="min-h-[720px] bg-background p-6">
      <CreateStoryModal open={open} onOpenChange={setOpen} />
    </div>
  );
}

export const Open: Story = {
  render: () => <ModalHarness initialOpen />,
};

export const Closed: Story = {
  render: () => <ModalHarness initialOpen={false} />,
};

export const MobileViewport: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => <ModalHarness initialOpen />,
};
