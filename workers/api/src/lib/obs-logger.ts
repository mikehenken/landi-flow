import {
  buildObsLogEvent,
  serializeObsLogEvent,
  type ObsLogEvent,
  type ObsLogLevel,
} from '@landi-flow/core/observability/structured-log';
import type { CorrelationContext } from '@landi-flow/core/types';
import type { ApiWorkerEnv } from '../middleware/auth.js';

const SERVICE_NAME = 'landi-flow-api';

export function logObs(
  level: ObsLogLevel,
  message: string,
  correlation: CorrelationContext,
  context?: Record<string, unknown>,
): ObsLogEvent {
  const event = buildObsLogEvent(SERVICE_NAME, level, message, correlation, context);
  const serialized = serializeObsLogEvent(event);
  if (level === 'error' || level === 'warn') {
    console.error(serialized);
  } else {
    console.log(serialized);
  }
  return event;
}

export async function emitObsToSink(
  env: ApiWorkerEnv,
  event: ObsLogEvent,
): Promise<void> {
  const sinkUrl = env.OBS_ERROR_SINK_URL?.trim();
  if (!sinkUrl) {
    return;
  }

  try {
    await fetch(sinkUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Landi-Correlation-Id': event.correlation_id,
      },
      body: serializeObsLogEvent(event),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'obs_sink_failed';
    console.error(
      serializeObsLogEvent(
        buildObsLogEvent(
          SERVICE_NAME,
          'error',
          `OBS sink delivery failed: ${message}`,
          { correlation_id: event.correlation_id },
        ),
      ),
    );
  }
}

export async function logAndSinkObsError(
  env: ApiWorkerEnv,
  message: string,
  correlation: CorrelationContext,
  context?: Record<string, unknown>,
): Promise<void> {
  const event = logObs('error', message, correlation, context);
  await emitObsToSink(env, event);
}
