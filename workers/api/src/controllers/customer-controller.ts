import { ENTITY_TOPICS } from '@landi-flow/core/events';
import type { CorrelationContext } from '@landi-flow/core/types';
import { BaseController } from './base-controller.js';

export type CustomerStatus = 'active' | 'inactive' | 'churned';

export interface Customer {
  id: string;
  workspace_id: string;
  name: string;
  domain: string;
  tier: string | null;
  revenue: number | null;
  status: CustomerStatus;
  created_by: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerCreateInput {
  name: string;
  domain: string;
  tier?: string | null;
  revenue?: number | null;
  status?: CustomerStatus;
}

export interface CustomerUpdateInput {
  name?: string;
  domain?: string;
  tier?: string | null;
  revenue?: number | null;
  status?: CustomerStatus;
}

export class CustomerController extends BaseController {
  async list(workspaceId: string): Promise<Customer[]> {
    await this.assertWorkspaceMember(workspaceId);

    const { data, error } = await this.db
      .from('customers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('archived_at', null)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list customers: ${error.message}`);
    }

    return (data ?? []) as Customer[];
  }

  async create(
    workspaceId: string,
    input: CustomerCreateInput,
    ctx: CorrelationContext,
  ): Promise<{ customer: Customer; correlation_id: string; outbox_event_id: string | null }> {
    await this.assertWorkspaceMember(workspaceId);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<Customer>(
      workspaceId,
      ENTITY_TOPICS.WORKSPACE_UPDATED,
      { action: 'customer_created', domain: input.domain },
      ctx,
      'create_customer',
      {
        name: input.name,
        domain: input.domain,
        tier: input.tier ?? null,
        revenue: input.revenue ?? null,
        status: input.status ?? 'active',
        created_by: this.userId,
      },
    );

    return { customer: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async update(
    workspaceId: string,
    customerId: string,
    input: CustomerUpdateInput,
    ctx: CorrelationContext,
  ): Promise<{ customer: Customer; correlation_id: string; outbox_event_id: string | null }> {
    await this.assertWorkspaceMember(workspaceId);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<Customer>(
      workspaceId,
      ENTITY_TOPICS.WORKSPACE_UPDATED,
      { action: 'customer_updated', customer_id: customerId },
      ctx,
      'update_customer',
      {
        customer_id: customerId,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.domain !== undefined ? { domain: input.domain } : {}),
        ...(input.tier !== undefined ? { tier: input.tier } : {}),
        ...(input.revenue !== undefined ? { revenue: input.revenue } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    );

    return { customer: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async delete(
    workspaceId: string,
    customerId: string,
    ctx: CorrelationContext,
  ): Promise<{ customer: Customer; correlation_id: string; outbox_event_id: string | null }> {
    await this.assertWorkspaceMember(workspaceId);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<Customer>(
      workspaceId,
      ENTITY_TOPICS.WORKSPACE_UPDATED,
      { action: 'customer_deleted', customer_id: customerId },
      ctx,
      'delete_customer',
      { customer_id: customerId },
    );

    return { customer: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }
}
