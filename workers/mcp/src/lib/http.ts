const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export function newCorrelationId(): string {
  return crypto.randomUUID();
}

export function correlationFromRequest(request: Request): string {
  const header =
    request.headers.get('X-Landi-Correlation-Id') ??
    request.headers.get('x-landi-correlation-id');
  return header && header.length > 0 ? header : newCorrelationId();
}

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  extraHeaders?: Record<string, string>
): Response {
  return jsonResponse({ error: code, error_description: message }, status, extraHeaders);
}

/**
 * MCP unauthorized response — MUST advertise the protected-resource metadata
 * document per RFC 9728 so clients can discover the authorization server.
 */
export function unauthorizedResponse(resourceMetadataUrl: string, message = 'Unauthorized'): Response {
  return errorResponse('unauthorized', message, 401, {
    'WWW-Authenticate': `Bearer resource_metadata="${resourceMetadataUrl}"`,
  });
}

export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Landi-Correlation-Id, mcp-protocol-version',
    'Access-Control-Max-Age': '86400',
  };
}

export function preflightResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export function clientIp(request: Request): string | null {
  return (
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For') ??
    null
  );
}
