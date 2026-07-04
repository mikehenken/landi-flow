/**
 * MCP Worker — Landi Flow.
 *
 * Surfaces:
 *   - GET  /                                    service + configured-key-name health
 *   - GET  /.well-known/oauth-protected-resource (RFC 9728)
 *   - GET  /.well-known/oauth-authorization-server (RFC 8414)
 *   - POST /register                            RFC 7591 Dynamic Client Registration
 *   - GET  /authorize                           OAuth 2.1 auth code + PKCE
 *   - POST /token                               code / refresh / client_credentials
 *   - POST /revoke                              RFC 7009 revocation
 *   - POST /mcp                                 Streamable HTTP JSON-RPC (tools)
 *   - /api/mcp/keys, /api/mcp/oauth-clients     user credential management
 *
 * Secrets are read by NAME only from `env` (never printed). MCP writes route through
 * the Agent Action Bus; AI inference (where used) routes through Cloudflare AI Gateway.
 */
import { MCP_ENV_KEY_NAMES, resolveResourceUri, type McpWorkerEnv } from './env.js';
import { createServiceDbClient } from './lib/db.js';
import {
  correlationFromRequest,
  corsHeaders,
  errorResponse,
  jsonResponse,
  preflightResponse,
  unauthorizedResponse,
} from './lib/http.js';
import { recordCredentialAudit } from './lib/audit.js';
import { OAuthService } from './auth/oauth.js';
import { authenticateMcpRequest } from './auth/authenticate.js';
import { AiGatewayClient } from './ai/gateway.js';
import { handleMcpPost } from './mcp/server.js';
import { handleManagementRequest } from './routes/management.js';

export default {
  async fetch(request: Request, env: McpWorkerEnv): Promise<Response> {
    try {
      const response = await route(request, env);
      return withCors(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return withCors(errorResponse('server_error', message, 500));
    }
  },
};

async function route(request: Request, env: McpWorkerEnv): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') {
    return preflightResponse();
  }

  // Health / discovery (no secrets required).
  if (path === '/' && request.method === 'GET') {
    return jsonResponse({
      service: 'landi-flow-mcp',
      status: 'ok',
      mcp_endpoint: '/mcp',
      protocol: 'streamable-http (OAuth 2.1 + DCR)',
      configured_env_key_names: MCP_ENV_KEY_NAMES.filter((name) =>
        Boolean((env as unknown as Record<string, unknown>)[name])
      ),
    });
  }
  if (path === '/health' && request.method === 'GET') {
    return jsonResponse({ status: 'ok' });
  }

  // --- OAuth discovery metadata -----------------------------------------
  if (path === '/.well-known/oauth-protected-resource' && request.method === 'GET') {
    return new OAuthService(createServiceDbClient(env), env, url).protectedResourceMetadata();
  }
  if (
    (path === '/.well-known/oauth-authorization-server' ||
      path === '/.well-known/openid-configuration') &&
    request.method === 'GET'
  ) {
    return new OAuthService(createServiceDbClient(env), env, url).authorizationServerMetadata();
  }

  // --- OAuth endpoints ---------------------------------------------------
  if (path === '/register' && request.method === 'POST') {
    return new OAuthService(createServiceDbClient(env), env, url).register(request);
  }
  if (path === '/authorize' && request.method === 'GET') {
    return new OAuthService(createServiceDbClient(env), env, url).authorize(request, url);
  }
  if (path === '/token' && request.method === 'POST') {
    return new OAuthService(createServiceDbClient(env), env, url).token(request);
  }
  if (path === '/revoke' && request.method === 'POST') {
    return new OAuthService(createServiceDbClient(env), env, url).revoke(request);
  }

  // --- Credential management --------------------------------------------
  if (path.startsWith('/api/mcp/')) {
    const db = createServiceDbClient(env);
    const handled = await handleManagementRequest(request, env, db, url);
    if (handled) {
      return handled;
    }
    return errorResponse('not_found', 'Management route not found', 404);
  }

  // --- MCP streamable HTTP ----------------------------------------------
  if (path === '/mcp') {
    if (request.method === 'GET') {
      // SSE server-initiated stream is not implemented; clients use POST.
      return errorResponse('method_not_allowed', 'Use POST for the MCP endpoint', 405, { Allow: 'POST' });
    }
    if (request.method !== 'POST') {
      return errorResponse('method_not_allowed', 'Method not allowed', 405, { Allow: 'POST' });
    }

    const db = createServiceDbClient(env);
    const resourceUri = resolveResourceUri(env, url);
    const resourceMetadataUrl = `${url.protocol}//${url.host}/.well-known/oauth-protected-resource`;
    const correlationId = correlationFromRequest(request);

    const auth = await authenticateMcpRequest(request, env, db, resourceUri);
    if (!auth.ok) {
      await recordCredentialAudit(db, {
        event: 'denied',
        request,
        detail: { stage: 'authenticate', reason: auth.reason },
      });
      // Uniform 401 with RFC 9728 discovery pointer (no reason leaked).
      return unauthorizedResponse(resourceMetadataUrl);
    }

    return handleMcpPost({
      db,
      principal: auth.principal,
      gateway: new AiGatewayClient(env),
      env,
      resourceUri,
      correlationId,
      request,
    });
  }

  return errorResponse('not_found', 'Not found', 404);
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders())) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
