import type { CorrelationContext } from '../types/index.js';

/** OBS-001 structured log severity levels. */
export type ObsLogLevel = 'debug' | 'info' | 'warn' | 'error';

/** OBS-001 canonical structured log envelope. */
export interface ObsLogEvent {
  level: ObsLogLevel;
  message: string;
  correlation_id: string;
  causation_id?: string;
  service: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export function buildObsLogEvent(
  service: string,
  level: ObsLogLevel,
  message: string,
  correlation: CorrelationContext,
  context?: Record<string, unknown>,
): ObsLogEvent {
  return {
    level,
    message,
    correlation_id: correlation.correlation_id,
    ...(correlation.causation_id ? { causation_id: correlation.causation_id } : {}),
    service,
    timestamp: new Date().toISOString(),
    ...(context ? { context } : {}),
  };
}

export function serializeObsLogEvent(event: ObsLogEvent): string {
  return JSON.stringify(event);
}
