import type { Meta, StoryObj } from '@storybook/react';
import { WorkspaceThemeProvider } from '@/theme/workspace-theme-provider';
import { Button } from '@/components/ui/button';
import { EpicBadge } from '@/components/badges/epic-badge';

/** White-label theme injection per theming-whitelabel-spec. */
const meta: Meta<typeof WorkspaceThemeProvider> = {
  title: 'Theme/WorkspaceThemeProvider',
  component: WorkspaceThemeProvider,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof WorkspaceThemeProvider>;

export const DefaultBrand: Story = {
  render: () => (
    <div className="space-y-4">
      <Button>Create Story</Button>
      <EpicBadge name="Default Landi Flow Theme" status="in_progress" />
    </div>
  ),
};

export const AgencyOverride: Story = {
  render: () => (
    <WorkspaceThemeProvider
      theme={{
        brand_primary: '210 100% 50%',
        surface: '220 10% 12%',
      }}
    >
      <div className="rounded-lg border border-border bg-surface p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Agency workspace with custom brand-primary and surface tokens.
        </p>
        <Button>Create Story</Button>
        <EpicBadge name="Client Branding Epic" status="in_progress" />
      </div>
    </WorkspaceThemeProvider>
  ),
};
