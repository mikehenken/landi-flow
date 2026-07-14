import type { CorrelationContext, CustomerRequest } from '@landi-flow/core/types';
import { BaseController } from './base-controller.js';

export interface CustomerRequestCreateInput {
  customer_id: string;
  quote: string;
  source?: CustomerRequest['source'];
  source_url?: string | null;
  requester_name?: string | null;
  is_important?: boolean;
}

export interface CustomerRequestLinkInput {
  story_id?: string;
  epic_id?: string;
}

interface CustomerRequestRow {
  id: string;
  workspace_id: string;
  customer_id: string;
  quote: string;
  source: CustomerRequest['source'];
  source_url: string | null;
  requester_name: string | null;
  is_important: boolean;
  correlation_id: string | null;
  created_at: string;
  updated_at: string;
}

export class CustomerRequestController extends BaseController {
  private async hydrateLinks(
    workspaceId: string,
    rows: CustomerRequestRow[],
  ): Promise<CustomerRequest[]> {
    if (rows.length === 0) {
      return [];
    }

    const requestIds = rows.map((row) => row.id);
    const [storyLinks, epicLinks] = await Promise.all([
      this.db
        .from('customer_request_stories')
        .select('request_id, story_id')
        .in('request_id', requestIds),
      this.db
        .from('customer_request_epics')
        .select('request_id, epic_id')
        .in('request_id', requestIds),
    ]);

    const storyMap = new Map<string, string[]>();
    for (const link of storyLinks.data ?? []) {
      const row = link as { request_id: string; story_id: string };
      const existing = storyMap.get(row.request_id) ?? [];
      existing.push(row.story_id);
      storyMap.set(row.request_id, existing);
    }

    const epicMap = new Map<string, string[]>();
    for (const link of epicLinks.data ?? []) {
      const row = link as { request_id: string; epic_id: string };
      const existing = epicMap.get(row.request_id) ?? [];
      existing.push(row.epic_id);
      epicMap.set(row.request_id, existing);
    }

    return rows.map((row) => ({
      ...row,
      story_ids: storyMap.get(row.id) ?? [],
      epic_ids: epicMap.get(row.id) ?? [],
    }));
  }

  async list(workspaceId: string): Promise<CustomerRequest[]> {
    await this.assertWorkspaceMember(workspaceId);

    const { data, error } = await this.db
      .from('customer_requests')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list customer requests: ${error.message}`);
    }

    return this.hydrateLinks(workspaceId, (data ?? []) as CustomerRequestRow[]);
  }

  async create(
    workspaceId: string,
    input: CustomerRequestCreateInput,
    ctx: CorrelationContext,
  ): Promise<{ request: CustomerRequest; correlation_id: string }> {
    await this.assertWorkspaceMember(workspaceId);

    const { data, error } = await this.db
      .from('customer_requests')
      .insert({
        workspace_id: workspaceId,
        customer_id: input.customer_id,
        quote: input.quote,
        source: input.source ?? 'web',
        source_url: input.source_url ?? null,
        requester_name: input.requester_name ?? null,
        is_important: input.is_important ?? false,
        correlation_id: ctx.correlation_id,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create customer request: ${error?.message ?? 'unknown error'}`);
    }

    const [request] = await this.hydrateLinks(workspaceId, [data as CustomerRequestRow]);
    return { request, correlation_id: ctx.correlation_id };
  }

  async link(
    workspaceId: string,
    requestId: string,
    input: CustomerRequestLinkInput,
    ctx: CorrelationContext,
  ): Promise<{ request: CustomerRequest; correlation_id: string }> {
    await this.assertWorkspaceMember(workspaceId);

    if (input.story_id) {
      const { error } = await this.db.from('customer_request_stories').upsert({
        request_id: requestId,
        story_id: input.story_id,
      });
      if (error) {
        throw new Error(`Failed to link story to request: ${error.message}`);
      }
    }

    if (input.epic_id) {
      const { error } = await this.db.from('customer_request_epics').upsert({
        request_id: requestId,
        epic_id: input.epic_id,
      });
      if (error) {
        throw new Error(`Failed to link epic to request: ${error.message}`);
      }
    }

    const { data, error: fetchError } = await this.db
      .from('customer_requests')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', requestId)
      .maybeSingle();

    if (fetchError || !data) {
      throw new Error(`Customer request not found: ${fetchError?.message ?? requestId}`);
    }

    const [request] = await this.hydrateLinks(workspaceId, [data as CustomerRequestRow]);
    return { request, correlation_id: ctx.correlation_id };
  }
}
