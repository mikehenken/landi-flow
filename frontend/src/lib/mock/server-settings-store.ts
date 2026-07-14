import type { CustomerRequest } from '@landi-flow/core/types';
import { DEMO_WORKSPACE_ID, SEED_CUSTOMER_REQUESTS } from '@/lib/seed-data';

type GlobalMockStore = typeof globalThis & {
  __landiMockCustomerRequests?: CustomerRequest[];
};

function seedRequests(): CustomerRequest[] {
  return SEED_CUSTOMER_REQUESTS.map((request) => ({
    ...request,
    story_ids: [...request.story_ids],
    epic_ids: [...request.epic_ids],
  }));
}

function getStoreRef(): CustomerRequest[] {
  const globalStore = globalThis as GlobalMockStore;
  if (!globalStore.__landiMockCustomerRequests) {
    globalStore.__landiMockCustomerRequests = seedRequests();
  }
  return globalStore.__landiMockCustomerRequests;
}

function setStoreRef(requests: CustomerRequest[]): void {
  const globalStore = globalThis as GlobalMockStore;
  globalStore.__landiMockCustomerRequests = requests;
}

export function resetServerMockCustomerRequests(): void {
  setStoreRef(seedRequests());
}

export function listServerCustomerRequests(workspaceId: string): CustomerRequest[] {
  return getStoreRef().filter((request) => request.workspace_id === workspaceId);
}

export function createServerCustomerRequest(input: {
  workspaceId: string;
  customerId: string;
  quote: string;
  requesterName?: string | null;
  source?: CustomerRequest['source'];
  correlationId?: string | null;
}): CustomerRequest {
  const now = new Date().toISOString();
  const request: CustomerRequest = {
    id: `request-${crypto.randomUUID()}`,
    workspace_id: input.workspaceId,
    customer_id: input.customerId,
    quote: input.quote.trim(),
    source: input.source ?? 'api',
    source_url: null,
    requester_name: input.requesterName ?? null,
    is_important: false,
    correlation_id: input.correlationId ?? null,
    story_ids: [],
    epic_ids: [],
    created_at: now,
    updated_at: now,
  };
  setStoreRef([request, ...getStoreRef()]);
  return request;
}

export function linkServerCustomerRequest(input: {
  workspaceId: string;
  requestId: string;
  storyId?: string;
  epicId?: string;
}): CustomerRequest | null {
  const store = getStoreRef();
  const index = store.findIndex(
    (request) => request.id === input.requestId && request.workspace_id === input.workspaceId,
  );
  if (index < 0) {
    return null;
  }
  const current = store[index]!;
  const storyIds =
    input.storyId && !current.story_ids.includes(input.storyId)
      ? [...current.story_ids, input.storyId]
      : current.story_ids;
  const epicIds =
    input.epicId && !current.epic_ids.includes(input.epicId)
      ? [...current.epic_ids, input.epicId]
      : current.epic_ids;
  const updated: CustomerRequest = {
    ...current,
    story_ids: storyIds,
    epic_ids: epicIds,
    updated_at: new Date().toISOString(),
  };
  const next = store.map((row, rowIndex) => (rowIndex === index ? updated : row));
  setStoreRef(next);
  return updated;
}

export const SERVER_MOCK_DEFAULT_WORKSPACE_ID = DEMO_WORKSPACE_ID;
