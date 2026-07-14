'use client';

import * as React from 'react';
import type { CorrelationContext } from '@landi-flow/core/types';
import { ErrorFallback } from '@landi-flow/ui';
import { createCorrelationContext } from '@/lib/correlation';
import { reportObsClientError } from '@/lib/obs-client';

export interface ObsErrorBoundaryProps {
  children: React.ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ObsErrorBoundaryState {
  hasError: boolean;
  message: string;
  correlation: CorrelationContext;
}

/**
 * OBS-001 error boundary — surfaces correlation_id on render failures.
 */
export class ObsErrorBoundary extends React.Component<
  ObsErrorBoundaryProps,
  ObsErrorBoundaryState
> {
  constructor(props: ObsErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
      correlation: createCorrelationContext(),
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ObsErrorBoundaryState> {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
      correlation: createCorrelationContext(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    void reportObsClientError(error.message, {
      component_stack: errorInfo.componentStack,
      boundary: 'ObsErrorBoundary',
    }, this.state.correlation.correlation_id);
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      message: '',
      correlation: createCorrelationContext(),
    });
    this.props.onReset?.();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          message={this.props.fallbackMessage ?? this.state.message}
          correlation={this.state.correlation}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
