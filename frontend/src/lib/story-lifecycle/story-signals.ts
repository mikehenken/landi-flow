import type { ActivityEvent } from '@landi-flow/core/types';
import { SIGNAL_TOPICS } from '@landi-flow/core/events';
import {
  buildSignalSummary,
  buildSignalTitle,
  extractSignalInlineContent,
  readPayloadString,
} from '@/lib/story-lifecycle/signal-payload';

export const SIGNAL_ATTACHED_EVENT = SIGNAL_TOPICS.ATTACHED;

export interface EngineeringSignalView {
  id: string;
  activityEventId: string;
  kind: string;
  status: string | null;
  source: string | null;
  title: string;
  summary: string;
  traceId: string | null;
  correlationId: string | null;
  actorName: string | null;
  createdAt: string;
  payload: Record<string, unknown>;
}

export function isSignalAttachedEvent(event: ActivityEvent): boolean {
  return event.event_type === SIGNAL_ATTACHED_EVENT;
}

export function extractEngineeringSignal(event: ActivityEvent): EngineeringSignalView | null {
  if (!isSignalAttachedEvent(event)) {
    return null;
  }

  const payload = event.payload ?? {};
  const kind = readPayloadString(payload, 'kind') ?? 'engineering';
  const status = readPayloadString(payload, 'status');
  const source = readPayloadString(payload, 'source');
  const traceId = readPayloadString(payload, 'trace_id');
  const correlationId =
    readPayloadString(payload, 'correlation_id') ?? event.correlation_id ?? null;
  const inlineContent = extractSignalInlineContent(payload);

  return {
    id: event.id,
    activityEventId: event.id,
    kind,
    status,
    source,
    title: buildSignalTitle(payload),
    summary: buildSignalSummary(payload, inlineContent),
    traceId,
    correlationId,
    actorName: event.actor_name,
    createdAt: event.created_at,
    payload,
  };
}

export function extractEngineeringSignals(events: ActivityEvent[]): EngineeringSignalView[] {
  const signals = events
    .filter(isSignalAttachedEvent)
    .map(extractEngineeringSignal)
    .filter((signal): signal is EngineeringSignalView => signal !== null);

  const seen = new Set<string>();
  const deduped: EngineeringSignalView[] = [];
  for (const signal of signals) {
    const key = [
      signal.correlationId ?? '',
      signal.kind,
      signal.status ?? '',
      signal.source ?? '',
      signal.traceId ?? '',
    ].join('|');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(signal);
  }
  return deduped;
}

/** Newest-first ordering for story detail signals (CAP / MCP-IDE-003). */
export function sortEngineeringSignalsNewestFirst(
  signals: EngineeringSignalView[],
): EngineeringSignalView[] {
  return [...signals].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}
