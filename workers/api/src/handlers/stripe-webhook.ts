import Stripe from 'stripe';
import type { ApiWorkerEnv } from '../middleware/auth.js';
import { createDbClient } from '../lib/db.js';
import { correlationFromRequest, errorResponse, jsonResponse } from '../lib/http.js';
import { getStripeClient, mapStripePriceToPlan } from '../lib/stripe-client.js';

export async function handleStripeInboundWebhook(
  request: Request,
  env: ApiWorkerEnv
): Promise<Response> {
  const correlation = correlationFromRequest(request);
  const correlationId = correlation.correlation_id;

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return errorResponse('missing_signature', 'Missing Stripe-Signature header', 400, correlationId);
  }

  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return errorResponse('stripe_not_configured', 'STRIPE_WEBHOOK_SECRET is not configured', 503, correlationId);
  }

  const stripe = getStripeClient(env);
  if (!stripe) {
    return errorResponse('stripe_not_configured', 'STRIPE_SECRET_KEY is not configured', 503, correlationId);
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature verification failed';
    return errorResponse('invalid_signature', message, 400, correlationId);
  }

  const db = createDbClient(env);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspace_id;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

        if (workspaceId && customerId) {
          await db
            .from('subscriptions')
            .upsert(
              {
                workspace_id: workspaceId,
                stripe_customer_id: customerId,
                plan_key: 'pro',
                status: 'active',
              },
              { onConflict: 'workspace_id' }
            );
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const workspaceId = subscription.metadata?.workspace_id;
        if (!workspaceId) {
          break;
        }

        const priceId = subscription.items.data[0]?.price.id;
        const planKey =
          event.type === 'customer.subscription.deleted'
            ? 'free'
            : mapStripePriceToPlan(priceId, env);
        const status =
          event.type === 'customer.subscription.deleted' ? 'canceled' : subscription.status;

        await db.rpc('sync_subscription_from_stripe', {
          p_workspace_id: workspaceId,
          p_stripe_customer_id:
            typeof subscription.customer === 'string'
              ? subscription.customer
              : subscription.customer?.id ?? null,
          p_stripe_subscription_id: subscription.id,
          p_plan_key: planKey,
          p_status: status,
          p_current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          p_correlation_id: correlationId,
        });
        break;
      }

      default:
        break;
    }

    return jsonResponse({ received: true, type: event.type, correlation_id: correlationId }, 200, correlationId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe webhook processing failed';
    return errorResponse('webhook_processing_error', message, 500, correlationId);
  }
}
