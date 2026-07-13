import type { ActivityEvent } from '@landi-flow/core/types';

function readPayloadString(
  payload: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  if (!payload) {
    return null;
  }
  const value = payload[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Stable identity for signal.attached rows (story_id + signal id / fingerprint). */
export function activitySignalDedupeKey(event: ActivityEvent): string {
  const payload = event.payload ?? {};
  const signalId =
    readPayloadString(payload, 'id') ??
    readPayloadString(payload, 'signal_id') ??
    readPayloadString(payload, 'correlation_id') ??
    event.correlation_id;
  if (signalId) {
    return `${event.story_id ?? ''}|${event.event_type}|${signalId}`;
  }
  const kind = readPayloadString(payload, 'kind') ?? '';
  const status = readPayloadString(payload, 'status') ?? '';
  const source = readPayloadString(payload, 'source') ?? '';
  const traceId = readPayloadString(payload, 'trace_id') ?? '';
  return `${event.story_id ?? ''}|${event.event_type}|${kind}|${status}|${source}|${traceId}`;
}

/**
 * Collapse duplicate signal.attached activity rows by (story_id, signal_id, type).
 * Keeps first occurrence (caller should pass newest-first order).
 */
export function dedupeActivityEvents(events: ActivityEvent[]): ActivityEvent[] {
  const seen = new Set<string>();
  const result: ActivityEvent[] = [];

  for (const event of events) {
    const key =
      event.event_type === 'signal.attached'
        ? activitySignalDedupeKey(event)
        : `id:${event.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(event);
  }

  return result;
}
