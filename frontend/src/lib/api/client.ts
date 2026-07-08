import { createCorrelationContext } from '@/lib/correlation';
import { API_V1_BASE } from '@/lib/api/config';

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly correlationId: string | null;

  constructor(message: string, status: number, code: string | null, correlationId: string | null) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  correlationId?: string;
}

function buildHeaders(options: ApiFetchOptions): Headers {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  const correlation = options.correlationId ?? createCorrelationContext().correlation_id;
  headers.set('X-Landi-Correlation-Id', correlation);
  return headers;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  const url = `${API_V1_BASE}/${normalizedPath}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: buildHeaders(options),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const errorBody =
      typeof payload.error === 'object' && payload.error !== null
        ? (payload.error as Record<string, unknown>)
        : null;
    const message =
      typeof errorBody?.message === 'string'
        ? errorBody.message
        : typeof payload.message === 'string'
          ? payload.message
          : typeof payload.error === 'string'
            ? payload.error
            : `API request failed (${response.status})`;
    throw new ApiRequestError(
      message,
      response.status,
      typeof errorBody?.code === 'string'
        ? errorBody.code
        : typeof payload.code === 'string'
          ? payload.code
          : null,
      typeof errorBody?.correlation_id === 'string'
        ? errorBody.correlation_id
        : typeof payload.correlation_id === 'string'
          ? payload.correlation_id
          : null,
    );
  }

  return payload as T;
}

export async function apiList<T>(path: string): Promise<T[]> {
  const payload = await apiFetch<{ data: T[] }>(path, { method: 'GET' });
  return payload.data ?? [];
}
