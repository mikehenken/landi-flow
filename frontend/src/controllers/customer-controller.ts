import type { CustomerRecord } from '@/lib/seed-data';
import { isMockAuthEnabled } from '@/lib/api/config';
import { apiFetch, apiList } from '@/lib/api/client';
import { mapCustomerRow, type DbCustomerRow } from '@/lib/api/mappers';
import { SEED_CUSTOMERS } from '@/lib/seed-data';
import { customerStore } from '@/stores/customer-store';

export interface CreateCustomerInput {
  workspaceId: string;
  name: string;
  domain: string;
  tier?: string | null;
  revenue?: number | null;
}

export async function loadCustomers(workspaceId: string): Promise<CustomerRecord[]> {
  if (isMockAuthEnabled()) {
    return SEED_CUSTOMERS;
  }
  const rows = await apiList<DbCustomerRow>(`workspaces/${workspaceId}/customers`);
  return rows.map(mapCustomerRow);
}

export async function createCustomer(input: CreateCustomerInput): Promise<CustomerRecord> {
  if (isMockAuthEnabled()) {
    const customer: CustomerRecord = {
      id: `customer-${Date.now()}`,
      name: input.name,
      domain: input.domain,
      tier: input.tier ?? null,
      revenue: input.revenue ?? null,
      status: 'active',
    };
    customerStore.upsertCustomer(customer);
    return customer;
  }

  const response = await apiFetch<{ customer: DbCustomerRow }>(
    `workspaces/${input.workspaceId}/customers`,
    {
      method: 'POST',
      body: {
        name: input.name,
        domain: input.domain,
        tier: input.tier ?? null,
        revenue: input.revenue ?? null,
      },
    },
  );
  const customer = mapCustomerRow(response.customer);
  customerStore.upsertCustomer(customer);
  return customer;
}

export async function updateCustomer(
  workspaceId: string,
  customer: CustomerRecord,
  patch: Partial<Pick<CustomerRecord, 'name' | 'domain' | 'tier' | 'revenue' | 'status'>>,
): Promise<CustomerRecord> {
  const previous = { ...customer };
  customerStore.upsertCustomer({ ...customer, ...patch });
  if (isMockAuthEnabled()) {
    return { ...customer, ...patch };
  }

  try {
    const response = await apiFetch<{ customer: DbCustomerRow }>(
      `workspaces/${workspaceId}/customers/${customer.id}`,
      { method: 'PATCH', body: patch },
    );
    const updated = mapCustomerRow(response.customer);
    customerStore.upsertCustomer(updated);
    return updated;
  } catch (error) {
    customerStore.upsertCustomer(previous);
    throw error;
  }
}

export async function deleteCustomer(
  workspaceId: string,
  customer: CustomerRecord,
): Promise<void> {
  customerStore.removeCustomer(customer.id);
  if (isMockAuthEnabled()) {
    return;
  }
  try {
    await apiFetch(`workspaces/${workspaceId}/customers/${customer.id}`, { method: 'DELETE' });
  } catch (error) {
    customerStore.upsertCustomer(customer);
    throw error;
  }
}
