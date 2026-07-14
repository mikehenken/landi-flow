import type { Meta, StoryObj } from '@storybook/react';
import { ErrorFallback, ErrorToastContent } from './error-fallback';

/** OBS-001 error surfaces with correlation_id for engineering support. */
const meta: Meta<typeof ErrorFallback> = {
  title: 'Observability/ErrorFallback',
  component: ErrorFallback,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ErrorFallback>;

const sampleCorrelation = {
  correlation_id: 'req_1a2b3c4d5e6f',
  causation_id: 'evt_9z8y7x6w5v4u',
};

export const Default: Story = {
  args: {
    message: 'Failed to save the Story due to a network timeout. Please try again.',
    correlation: sampleCorrelation,
    onRetry: () => undefined,
  },
};

export const EpicSaveError: Story = {
  args: {
    message: 'Failed to save Epic. The server did not respond in time.',
    correlation: { correlation_id: 'req_epic_7f8g9h0j' },
    onRetry: () => undefined,
  },
};

export const ToastContent: Story = {
  render: () => (
    <div className="w-[360px] rounded-lg border border-destructive/50 bg-surface-overlay p-4 shadow-lg">
      <ErrorToastContent
        message="Cannot connect to the database. Retry in a few moments."
        correlationId="req_db_timeout_001"
      />
    </div>
  ),
};

export const WithoutRetry: Story = {
  args: {
    message: 'An unexpected error occurred while loading Stories.',
    correlation: sampleCorrelation,
  },
};
