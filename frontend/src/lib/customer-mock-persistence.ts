import type { CustomerRecord } from '@/lib/seed-data';

export const MOCK_CUSTOMER_ADDITIONS_STORAGE_KEY = 'landi-flow:mock-customer-additions';

function readCustomerAdditions(): CustomerRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(MOCK_CUSTOMER_ADDITIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomerRecord[]) : [];
  } catch {
    return [];
  }
}

function writeCustomerAdditions(customers: CustomerRecord[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(MOCK_CUSTOMER_ADDITIONS_STORAGE_KEY, JSON.stringify(customers));
  } catch {
    // ignore storage errors
  }
}

export function applyMockCustomerAdditions(customers: CustomerRecord[]): CustomerRecord[] {
  const additions = readCustomerAdditions();
  if (additions.length === 0) {
    return customers;
  }
  const existingIds = new Set(customers.map((customer) => customer.id));
  const merged = [...customers];
  for (const customer of additions) {
    if (!existingIds.has(customer.id)) {
      merged.push(customer);
    }
  }
  return merged;
}

export function persistMockCustomerAddition(customer: CustomerRecord): void {
  const additions = readCustomerAdditions().filter((row) => row.id !== customer.id);
  writeCustomerAdditions([...additions, customer]);
}

export function clearMockCustomerAdditions(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(MOCK_CUSTOMER_ADDITIONS_STORAGE_KEY);
  } catch {
    // ignore
  }
}
