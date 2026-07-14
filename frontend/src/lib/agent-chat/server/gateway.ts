// Server-only module. Resolves the Cloudflare AI Gateway config from env by NAME
// (values are never logged). Inference routes through the AI Gateway's Google AI
// Studio provider passthrough (the OpenAI `/compat` unified endpoint is deprecated
// by Cloudflare and is not enabled on our gateway — it returns 2036/2019). The
// provider passthrough shares the same gateway origin, auth, and attribution spine.

export interface GatewayConfig {
  /** AI Gateway origin base: https://gateway.ai.cloudflare.com/v1/{account}/{gateway} */
  gatewayBase: string;
  gatewayToken: string;
  /** Google AI Studio (Gemini) API key — forwarded as `x-goog-api-key`. */
  providerKey: string;
  /** Bare model id (no provider prefix), e.g. `gemini-2.5-flash`. */
  defaultModel: string;
  fastModel: string;
}

export interface GatewayMetadata {
  workspace_id?: string;
  agent_id?: string;
  user_id?: string;
  feature?: string;
}

/** Strip a provider prefix (`google-ai-studio/`, `google/`) so we send a bare id. */
export function bareModel(model: string): string {
  const slash = model.lastIndexOf('/');
  return slash === -1 ? model : model.slice(slash + 1);
}

/**
 * Resolve gateway config, or `null` when not configured (dev without secrets →
 * the route falls back to a deterministic mock stream so the UI is fully
 * demonstrable and testable without any keys). Native passthrough requires a
 * provider key; without one we return `null` and the mock takes over.
 */
export function resolveGatewayConfig(): GatewayConfig | null {
  const explicit = process.env.CLOUDFLARE_AI_GATEWAY_ENDPOINT?.replace(/\/+$/, '');
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const gatewayId = process.env.CLOUDFLARE_AI_GATEWAY_ID;
  const gatewayToken = process.env.CLOUDFLARE_AI_GATEWAY_TOKEN;
  const providerKey = process.env.GEMINI_API_KEY ?? process.env.VERTEX_API_KEY ?? null;

  // The gateway origin base. Tolerate an explicit endpoint that already includes
  // the (deprecated) `/compat` suffix by stripping it back to the origin base.
  const gatewayBase =
    (explicit ? explicit.replace(/\/compat$/, '') : null) ??
    (account && gatewayId
      ? `https://gateway.ai.cloudflare.com/v1/${account}/${gatewayId}`
      : null);

  if (!gatewayBase || !gatewayToken || !providerKey) {
    return null;
  }

  const defaultModel = bareModel(process.env.DEFAULT_GEMINI_MODEL ?? 'gemini-2.5-flash');
  const fastModel = bareModel(process.env.DEFAULT_GEMINI_FAST_MODEL ?? defaultModel);

  return {
    gatewayBase,
    gatewayToken,
    providerKey,
    defaultModel,
    fastModel,
  };
}

/** Whether an explicit mock is forced (useful for E2E without a gateway). */
export function isMockForced(): boolean {
  const flag = process.env.FLOW_AI_FAKE;
  return flag === '1' || flag === 'true';
}

export function normalizeModel(config: GatewayConfig, model: string | undefined): string {
  if (!model) return config.defaultModel;
  return bareModel(model);
}

/**
 * Native Google AI Studio streaming URL through the AI Gateway. `alt=sse` yields
 * `data:`-prefixed `GenerateContentResponse` chunks.
 */
export function nativeStreamUrl(config: GatewayConfig, model: string): string {
  return `${config.gatewayBase}/google-ai-studio/v1beta/models/${model}:streamGenerateContent?alt=sse`;
}

export function gatewayHeaders(
  config: GatewayConfig,
  metadata: GatewayMetadata,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'cf-aig-authorization': `Bearer ${config.gatewayToken}`,
    'x-goog-api-key': config.providerKey,
    'cf-aig-request-timeout': '30000',
  };
  const pruned: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value) pruned[key] = value;
  }
  if (Object.keys(pruned).length > 0) {
    headers['cf-aig-metadata'] = JSON.stringify(pruned);
  }
  return headers;
}
