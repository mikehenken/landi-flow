import { WEBHOOK_TOPICS } from '@landi-flow/core/events';
import type { CorrelationContext, WebhookDelivery, WebhookEndpoint } from '@landi-flow/core/types';
import { BaseController } from './base-controller.js';

export interface WebhookCreateInput {
  url: string;
  resource_types?: string[];
  team_id?: string | null;
  all_public_teams?: boolean;
  enabled?: boolean;
  app_id?: string | null;
  signing_secret?: string;
}

export interface WebhookUpdateInput {
  url?: string;
  resource_types?: string[];
  enabled?: boolean;
  all_public_teams?: boolean;
}

export class WebhookController extends BaseController {
  async list(workspaceId: string): Promise<WebhookEndpoint[]> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { data, error } = await this.db
      .from('webhooks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list webhooks: ${error.message}`);
    }

    return (data ?? []) as WebhookEndpoint[];
  }

  async create(
    workspaceId: string,
    input: WebhookCreateInput,
    ctx: CorrelationContext
  ): Promise<{ webhook: WebhookEndpoint & { signing_secret?: string }; outbox_event_id: string | null }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<
      WebhookEndpoint & { signing_secret?: string }
    >(
      workspaceId,
      WEBHOOK_TOPICS.REGISTERED,
      { url: input.url, resource_types: input.resource_types ?? [] },
      ctx,
      'create_webhook',
      {
        url: input.url,
        resource_types: input.resource_types ?? [],
        team_id: input.team_id ?? null,
        all_public_teams: input.all_public_teams ?? false,
        enabled: input.enabled ?? true,
        app_id: input.app_id ?? null,
        signing_secret: input.signing_secret,
        created_by: this.userId,
      }
    );

    return { webhook: entity, outbox_event_id };
  }

  async update(
    workspaceId: string,
    webhookId: string,
    input: WebhookUpdateInput,
    ctx: CorrelationContext
  ): Promise<{ webhook: WebhookEndpoint; outbox_event_id: string | null }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<WebhookEndpoint>(
      workspaceId,
      WEBHOOK_TOPICS.UPDATED,
      { webhook_id: webhookId },
      ctx,
      'update_webhook',
      {
        webhook_id: webhookId,
        url: input.url,
        resource_types: input.resource_types,
        enabled: input.enabled,
        all_public_teams: input.all_public_teams,
      }
    );

    return { webhook: entity, outbox_event_id };
  }

  async remove(
    workspaceId: string,
    webhookId: string,
    ctx: CorrelationContext
  ): Promise<{ deleted: boolean; outbox_event_id: string | null }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { outbox_event_id } = await this.mutateWithOutbox<WebhookEndpoint>(
      workspaceId,
      WEBHOOK_TOPICS.DELETED,
      { webhook_id: webhookId },
      ctx,
      'delete_webhook',
      { webhook_id: webhookId }
    );

    return { deleted: true, outbox_event_id };
  }

  async listDeliveries(
    workspaceId: string,
    webhookId: string,
    limit = 50
  ): Promise<WebhookDelivery[]> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { data: webhook, error: hookError } = await this.db
      .from('webhooks')
      .select('id')
      .eq('id', webhookId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (hookError) {
      throw new Error(`Failed to verify webhook: ${hookError.message}`);
    }

    if (!webhook) {
      throw new Error('webhook_not_found');
    }

    const { data, error } = await this.db
      .from('webhook_deliveries')
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list webhook deliveries: ${error.message}`);
    }

    return (data ?? []) as WebhookDelivery[];
  }
}
