import type { ApiErrorBody, CorrelationContext } from '@landi-flow/core/types';

export function newCorrelationId(): string {
  return crypto.randomUUID();
}

export function correlationFromRequest(request: Request): CorrelationContext {
  const header =
    request.headers.get('X-Landi-Correlation-Id') ??
    request.headers.get('x-landi-correlation-id');
  return {
    correlation_id: header && header.length > 0 ? header : newCorrelationId(),
  };
}

export function jsonResponse(
  body: unknown,
  status: number,
  correlationId: string,
  extraHeaders?: Record<string, string>
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Landi-Correlation-Id': correlationId,
    ...extraHeaders,
  };
  return new Response(JSON.stringify(body), { status, headers });
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  correlationId: string,
  details?: Record<string, unknown>
): Response {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      correlation_id: correlationId,
      ...(details ? { details } : {}),
    },
  };
  return jsonResponse(body, status, correlationId);
}
