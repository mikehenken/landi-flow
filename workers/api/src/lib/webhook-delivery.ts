import type { ApiWorkerEnv } from '../middleware/auth.js';
import { createDbClient } from './db.js';
import { signWebhookPayload } from './webhook-signature.js';

interface ClaimedDeliveryRow {
  delivery_id: string;
  webhook_id: string;
  webhook_url: string;
  signing_secret: string;
  outbox_event_id: string | null;
  event_topic: string;
  payload: Record<string, unknown> | null;
  correlation_id: string;
  attempt: number;
}

export interface WebhookDeliveryStats {
  sent: number;
  failed: number;
}

export async function deliverPendingWebhooks(env: ApiWorkerEnv): Promise<WebhookDeliveryStats> {
  const db = createDbClient(env);
  const stats: WebhookDeliveryStats = { sent: 0, failed: 0 };

  const { data: rows, error } = await db.rpc('claim_pending_webhook_deliveries', {
    p_limit: 25,
  });

  if (error) {
    throw new Error(`Webhook delivery claim failed: ${error.message}`);
  }

  const deliveries = (rows ?? []) as ClaimedDeliveryRow[];

  for (const row of deliveries) {
    const bodyPayload = {
      id: row.outbox_event_id,
      topic: row.event_topic,
      data: row.payload ?? {},
      correlation_id: row.correlation_id,
      timestamp: new Date().toISOString(),
    };
    const bodyString = JSON.stringify(bodyPayload);
    const signature = await signWebhookPayload(bodyString, row.signing_secret);

    let responseStatus = 0;
    let success = false;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(row.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Landi-Event-Id': row.outbox_event_id ?? row.delivery_id,
          'X-Landi-Topic': row.event_topic,
          'X-Landi-Signature': signature,
          'X-Landi-Correlation-Id': row.correlation_id,
        },
        body: bodyString,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      responseStatus = response.status;
      success = response.ok;
    } catch (err) {
      console.error(`Webhook delivery ${row.delivery_id} network error:`, err);
      success = false;
    }

    const { error: completeError } = await db.rpc('complete_webhook_delivery', {
      p_delivery_id: row.delivery_id,
      p_response_status: responseStatus,
      p_signature: signature,
      p_success: success,
    });

    if (completeError) {
      console.error(`Failed to record delivery ${row.delivery_id}:`, completeError.message);
    }

    if (success) {
      stats.sent += 1;
    } else {
      stats.failed += 1;
    }
  }

  return stats;
}
