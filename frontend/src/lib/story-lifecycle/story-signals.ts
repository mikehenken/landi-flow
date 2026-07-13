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
  return events
    .filter(isSignalAttachedEvent)
    .map(extractEngineeringSignal)
    .filter((signal): signal is EngineeringSignalView => signal !== null);
}
