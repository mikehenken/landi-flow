'use client';

import * as React from 'react';
import type { CorrelationContext } from '@landi-flow/core/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ErrorFallbackProps {
  /** User-facing error message — blameless and actionable per OBS-001. */
  message: string;
  /** Correlation context from @landi-flow/core for observability. */
  correlation: CorrelationContext;
  onRetry?: () => void;
  onCopyTraceId?: (correlationId: string) => void;
  className?: string;
}

/**
 * OBS-001 error boundary fallback with correlation_id display.
 * Never swallows errors — always surfaces trace ID for engineering support.
 */
export function ErrorFallback({
  message,
  correlation,
  onRetry,
  onCopyTraceId,
  className,
}: ErrorFallbackProps): React.ReactElement {
  const handleCopy = React.useCallback(() => {
    if (onCopyTraceId) {
      onCopyTraceId(correlation.correlation_id);
      return;
    }
    void navigator.clipboard?.writeText(correlation.correlation_id);
  }, [correlation.correlation_id, onCopyTraceId]);

  return (
    <Card
      className={cn('border-destructive/50 bg-destructive/5', className)}
      role="alert"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-destructive">
          Something failed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-foreground">{message}</p>
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          Trace:{' '}
          <span
            className="text-foreground-subtle"
            data-testid="obs-correlation-id"
          >
            {correlation.correlation_id}
          </span>
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        {onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          Copy Trace ID
        </Button>
      </CardFooter>
    </Card>
  );
}

export interface ErrorToastContentProps {
  message: string;
  correlationId: string;
}

/** Inline toast content shape for OBS-001 system errors. */
export function ErrorToastContent({
  message,
  correlationId,
}: ErrorToastContentProps): React.ReactElement {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{message}</p>
      <p className="font-mono text-xs tabular-nums text-muted-foreground">
        Trace: {correlationId}
      </p>
    </div>
  );
}

export type { CorrelationContext };
