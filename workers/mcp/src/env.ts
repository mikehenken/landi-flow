/**
 * MCP Worker environment — key NAMES only (values injected at runtime via
 * `wrangler secret put` or `.env.local`; never committed, never logged).
 */
export interface McpWorkerEnv {
  // Supabase (linear_clone schema)
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;

  // MCP / OAuth
  MCP_OAUTH_ISSUER?: string;
  MCP_RESOURCE_URI?: string;
  /** Optional server-side pepper for HMAC-SHA256 credential hashing (defense in depth). */
  MCP_CREDENTIAL_PEPPER?: string;

  // Cloudflare AI Gateway (all read by NAME; values never printed)
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_AI_GATEWAY_ENDPOINT?: string;
  CLOUDFLARE_AI_GATEWAY_TOKEN?: string;
  CLOUDFLARE_AI_GATEWAY_ID?: string;

  // AI provider keys (read by NAME only — used as upstream provider auth via the gateway)
  GEMINI_API_KEY?: string;
  VERTEX_API_KEY?: string;
  DEFAULT_GEMINI_MODEL?: string;

  // Outbox
  ENABLE_OUTBOX_EMITTER?: string;

  // Liveblocks (agent room participation — key names only)
  LIVEBLOCKS_SECRET_KEY?: string;
}

/** Names of secrets this worker reads — surfaced for docs/health without values. */
export const MCP_ENV_KEY_NAMES = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MCP_OAUTH_ISSUER',
  'MCP_RESOURCE_URI',
  'MCP_CREDENTIAL_PEPPER',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_AI_GATEWAY_ENDPOINT',
  'CLOUDFLARE_AI_GATEWAY_TOKEN',
  'CLOUDFLARE_AI_GATEWAY_ID',
  'GEMINI_API_KEY',
  'VERTEX_API_KEY',
  'DEFAULT_GEMINI_MODEL',
  'LIVEBLOCKS_SECRET_KEY',
] as const;

export function requireServiceRoleKey(env: McpWorkerEnv): string {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for the MCP service tier');
  }
  return env.SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * Canonical resource identifier for RFC 8707 audience binding.
 * Falls back to the issuer + `/mcp` when MCP_RESOURCE_URI is unset.
 */
export function resolveResourceUri(env: McpWorkerEnv, requestUrl: URL): string {
  if (env.MCP_RESOURCE_URI) {
    return env.MCP_RESOURCE_URI;
  }
  const issuer = env.MCP_OAUTH_ISSUER ?? `${requestUrl.protocol}//${requestUrl.host}`;
  return `${issuer.replace(/\/$/, '')}/mcp`;
}

export function resolveIssuer(env: McpWorkerEnv, requestUrl: URL): string {
  return (env.MCP_OAUTH_ISSUER ?? `${requestUrl.protocol}//${requestUrl.host}`).replace(/\/$/, '');
}
