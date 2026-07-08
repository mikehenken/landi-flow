import type { CustomerRecord } from '@/lib/seed-data';
import { BaseDomainStore } from './base-domain-store';

export interface CustomerStoreState {
  customers: CustomerRecord[];
  loading: boolean;
  error: string | null;
}

const emptyState = (): CustomerStoreState => ({
  customers: [],
  loading: false,
  error: null,
});

class CustomerStore extends BaseDomainStore<CustomerStoreState> {
  private static instance: CustomerStore;
  private state: CustomerStoreState = emptyState();

  private constructor() {
    super();
  }

  static getInstance(): CustomerStore {
    if (!CustomerStore.instance) {
      CustomerStore.instance = new CustomerStore();
    }
    return CustomerStore.instance;
  }

  protected getSnapshot(): CustomerStoreState {
    return {
      customers: [...this.state.customers],
      loading: this.state.loading,
      error: this.state.error,
    };
  }

  hydrate(customers: CustomerRecord[]): void {
    this.state = { ...this.state, customers, loading: false, error: null };
    this.notify();
  }

  upsertCustomer(customer: CustomerRecord): void {
    const existingIndex = this.state.customers.findIndex((row) => row.id === customer.id);
    const customers =
      existingIndex >= 0
        ? this.state.customers.map((row, index) => (index === existingIndex ? customer : row))
        : [...this.state.customers, customer];
    this.state = { ...this.state, customers };
    this.notify();
  }

  removeCustomer(customerId: string): void {
    this.state = {
      ...this.state,
      customers: this.state.customers.filter((row) => row.id !== customerId),
    };
    this.notify();
  }

  setLoading(loading: boolean): void {
    this.state = { ...this.state, loading };
    this.notify();
  }

  setError(error: string | null): void {
    this.state = { ...this.state, error, loading: false };
    this.notify();
  }
}

export const customerStore = CustomerStore.getInstance();
