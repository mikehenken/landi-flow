import type { ApiWorkerEnv } from '../middleware/auth.js';
import { createDbClient } from './db.js';
import { deliverPendingWebhooks } from './webhook-delivery.js';

interface ClaimedOutboxEvent {
  id: string;
  workspace_id: string;
  topic: string;
}

export interface OutboxPollResult {
  events_claimed: number;
  deliveries_scheduled: number;
  deliveries_sent: number;
  deliveries_failed: number;
}

/** Poll pending outbox events and fan out webhook deliveries (event-driven pattern). */
export async function runOutboxPoller(env: ApiWorkerEnv): Promise<OutboxPollResult> {
  const db = createDbClient(env);
  const result: OutboxPollResult = {
    events_claimed: 0,
    deliveries_scheduled: 0,
    deliveries_sent: 0,
    deliveries_failed: 0,
  };

  const { data: events, error: claimError } = await db.rpc('claim_pending_outbox_events', {
    p_limit: 50,
  });

  if (claimError) {
    throw new Error(`Outbox claim failed: ${claimError.message}`);
  }

  const claimed = (events ?? []) as ClaimedOutboxEvent[];
  result.events_claimed = claimed.length;

  for (const event of claimed) {
    const { data: scheduled, error: scheduleError } = await db.rpc('schedule_webhook_deliveries', {
      p_outbox_event_id: event.id,
    });

    if (scheduleError) {
      console.error(`Failed to schedule deliveries for ${event.id}:`, scheduleError.message);
      continue;
    }

    result.deliveries_scheduled += Number(scheduled ?? 0);
  }

  const deliveryStats = await deliverPendingWebhooks(env);
  result.deliveries_sent = deliveryStats.sent;
  result.deliveries_failed = deliveryStats.failed;

  return result;
}
