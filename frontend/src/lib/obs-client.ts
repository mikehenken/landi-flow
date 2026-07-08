'use client';

import { createCorrelationContext } from '@/lib/correlation';

const CLIENT_SERVICE = 'landi-flow-frontend';

export interface ObsClientReport {
  message: string;
  correlation_id: string;
  level: 'error' | 'warn';
  context?: Record<string, unknown>;
}

/** OBS-001: report client errors to optional sink when enabled. */
export async function reportObsClientError(
  message: string,
  context?: Record<string, unknown>,
  correlationId?: string,
): Promise<string> {
  const correlation = correlationId ?? createCorrelationContext().correlation_id;
  const payload: ObsClientReport = {
    message,
    correlation_id: correlation,
    level: 'error',
    ...(context ? { context } : {}),
  };

  console.error(`[OBS-001] ${CLIENT_SERVICE}`, payload);

  if (
    process.env.NEXT_PUBLIC_OBS_ENABLE_CLIENT_REPORTING !== 'true' &&
    process.env.NEXT_PUBLIC_MOCK_AUTH !== 'true'
  ) {
    return correlation;
  }

  try {
    await fetch('/api/obs/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Landi-Correlation-Id': correlation,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Sink failures must not mask the original UI error.
  }

  return correlation;
}
