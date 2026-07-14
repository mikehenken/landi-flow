import type {
  AiGatewayUsageSummary,
  CorrelationContext,
  WorkspaceEntitlement,
  WorkspaceSubscription,
} from '@landi-flow/core/types';
import { BaseController } from './base-controller.js';
import { getStripeClient } from '../lib/stripe-client.js';

export class BillingController extends BaseController {
  async getSubscription(workspaceId: string): Promise<WorkspaceSubscription | null> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { data, error } = await this.db
      .from('subscriptions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get subscription: ${error.message}`);
    }

    return data as WorkspaceSubscription | null;
  }

  async listEntitlements(workspaceId: string): Promise<WorkspaceEntitlement[]> {
    await this.assertWorkspaceMember(workspaceId);

    const { data, error } = await this.db
      .from('entitlements')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('feature_key', { ascending: true });

    if (error) {
      throw new Error(`Failed to list entitlements: ${error.message}`);
    }

    return (data ?? []) as WorkspaceEntitlement[];
  }

  async createCheckoutSession(
    workspaceId: string,
    ctx: CorrelationContext
  ): Promise<{ url: string | null; session_id: string }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const stripe = getStripeClient(this.env);
    if (!stripe) {
      throw new Error('stripe_not_configured');
    }

    const priceId = this.env.STRIPE_PRICE_PRO_MONTHLY;
    if (!priceId) {
      throw new Error('stripe_price_not_configured');
    }

    const siteUrl = this.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/workspace?billing=success`,
      cancel_url: `${siteUrl}/workspace?billing=canceled`,
      metadata: {
        workspace_id: workspaceId,
        correlation_id: ctx.correlation_id,
      },
      subscription_data: {
        metadata: { workspace_id: workspaceId },
      },
    });

    if (!session.url) {
      throw new Error('stripe_checkout_url_missing');
    }

    return { url: session.url, session_id: session.id };
  }

  async createPortalSession(workspaceId: string): Promise<{ url: string }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const stripe = getStripeClient(this.env);
    if (!stripe) {
      throw new Error('stripe_not_configured');
    }

    const subscription = await this.getSubscription(workspaceId);
    if (!subscription?.stripe_customer_id) {
      throw new Error('stripe_customer_not_found');
    }

    const siteUrl = this.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const portal = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${siteUrl}/workspace`,
    });

    return { url: portal.url };
  }

  async getAiUsageSummary(workspaceId: string): Promise<AiGatewayUsageSummary> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { data, error } = await this.db
      .from('ai_gateway_usage')
      .select('tokens_in, tokens_out, cost_usd')
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new Error(`Failed to load AI usage: ${error.message}`);
    }

    const rows = data ?? [];
    return rows.reduce<AiGatewayUsageSummary>(
      (acc, row) => ({
        total_tokens_in: acc.total_tokens_in + (row.tokens_in ?? 0),
        total_tokens_out: acc.total_tokens_out + (row.tokens_out ?? 0),
        total_cost_usd: acc.total_cost_usd + Number(row.cost_usd ?? 0),
        request_count: acc.request_count + 1,
      }),
      { total_tokens_in: 0, total_tokens_out: 0, total_cost_usd: 0, request_count: 0 }
    );
  }
}
