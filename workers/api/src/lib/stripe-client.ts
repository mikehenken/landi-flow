import Stripe from 'stripe';
import type { ApiWorkerEnv } from '../middleware/auth.js';

export function getStripeClient(env: ApiWorkerEnv): Stripe | null {
  const key = env.STRIPE_SECRET_KEY;
  if (!key || key.length === 0) {
    return null;
  }

  return new Stripe(key, {
    apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
  });
}

export function mapStripePriceToPlan(priceId: string | undefined, env: ApiWorkerEnv): string {
  if (!priceId) {
    return 'free';
  }

  if (env.STRIPE_PRICE_PRO_MONTHLY && priceId === env.STRIPE_PRICE_PRO_MONTHLY) {
    return 'pro';
  }

  return 'pro';
}
