import type { Meta, StoryObj } from '@storybook/react';
import { BrandAssetsPreview } from './brand-assets-preview';

/**
 * Chief-ux visual review surface for task-09v brand assets.
 * Validates sidebar 32px mark, footer wordmark opacity, and workspace override precedence.
 */
const meta: Meta<typeof BrandAssetsPreview> = {
  title: 'Brand/BrandAssetsPreview',
  component: BrandAssetsPreview,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Production brand asset preview at app-shell display sizes. ' +
          'Canonical SVG assets scale cleanly at 32px; JPG fallbacks retained for OG/social.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof BrandAssetsPreview>;

/** Default app-shell sizes — sidebar 32px mark, footer wordmark at opacity-60. */
export const AppShellDefaults: Story = {
  args: {
    markSizePx: 32,
    wordmarkWidthPx: 120,
    wordmarkOpacity: 0.6,
  },
};

/** Sidebar mark at minimum readable size. */
export const SidebarMark32px: Story = {
  args: {
    markSizePx: 32,
    wordmarkWidthPx: 0,
    showLabels: true,
  },
  render: (args) => (
    <BrandAssetsPreview
      {...args}
      showLabels
    />
  ),
};

/** Footer wordmark treatment matching app-shell opacity-60. */
export const FooterWordmark: Story = {
  args: {
    markSizePx: 0,
    wordmarkWidthPx: 120,
    wordmarkOpacity: 0.6,
  },
};

/** Workspace white-label logo_url override takes precedence over default mark. */
export const WorkspaceOverride: Story = {
  args: {
    markSizePx: 32,
    wordmarkWidthPx: 120,
    logoOverrideUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=acme-agency',
  },
};

/** Full chief-ux review matrix — all criteria in one viewport. */
export const ChiefUxReviewMatrix: Story = {
  args: {
    markSizePx: 32,
    wordmarkWidthPx: 120,
    wordmarkOpacity: 0.6,
    showLabels: true,
  },
  parameters: {
    chromatic: { disableSnapshot: false },
  },
};
