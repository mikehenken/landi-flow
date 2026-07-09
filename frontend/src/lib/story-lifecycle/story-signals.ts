import type { ActivityEvent } from '@landi-flow/core/types';
import { SIGNAL_TOPICS } from '@landi-flow/core/events';

export const SIGNAL_ATTACHED_EVENT = SIGNAL_TOPICS.ATTACHED;

export interface EngineeringSignalView {
  id: string;
  activityEventId: string;
  kind: string;
  status: string | null;
  source: string | null;
  title: string;
  summary: string;
  correlationId: string | null;
  actorName: string | null;
  createdAt: string;
  payload: Record<string, unknown>;
}

function readPayloadString(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
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
  const url = readPayloadString(payload, 'url');
  const correlationId =
    readPayloadString(payload, 'correlation_id') ?? event.correlation_id ?? null;

  const titleParts = [kind.replace(/_/g, ' ')];
  if (status) {
    titleParts.push(status);
  }
  const title = titleParts.join(' · ');

  const summaryParts: string[] = [];
  if (source) {
    summaryParts.push(`Source: ${source}`);
  }
  if (url) {
    summaryParts.push(url);
  }
  if (summaryParts.length === 0) {
    summaryParts.push('Engineering signal attached');
  }

  return {
    id: event.id,
    activityEventId: event.id,
    kind,
    status,
    source,
    title,
    summary: summaryParts.join(' · '),
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
