/**
 * Cloudflare AI Gateway client (STUDY-013 architecture constraint: the clone NEVER
 * calls model providers directly — every inference request is proxied through the
 * AI Gateway for analytics, caching, rate-limiting, fallback, and per-tenant spend
 * attribution / cost governance).
 *
 * Secrets are read by NAME from the runtime env (never printed): the gateway endpoint
 * + token, account id, and upstream provider keys (GEMINI_API_KEY, VERTEX_API_KEY).
 *
 * Attribution spine: every request is tagged with `cf-aig-metadata`
 * ({ workspace_id, agent_id, user_id }) so AI-Gateway spend limits (IDEA-012 Cost
 * Governor) can be scoped per workspace/agent.
 */
import type { McpWorkerEnv } from '../env.js';

export interface AiGatewayMetadata {
  workspace_id?: string;
  agent_id?: string;
  user_id?: string;
  feature?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface ChatCompletionRequest {
  /** `{provider}/{model}` unified identifier, e.g. `google-ai-studio/gemini-2.5-flash`. */
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  metadata?: AiGatewayMetadata;
  /** Per-request cache TTL in seconds (min 60). Omit to skip caching. */
  cacheTtlSeconds?: number;
  /** First-byte timeout (ms) before the gateway errors/retries. */
  requestTimeoutMs?: number;
  signal?: AbortSignal;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  cacheStatus: string | null;
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  raw: unknown;
}

export class AiGatewayNotConfiguredError extends Error {
  constructor() {
    super('Cloudflare AI Gateway is not configured (missing endpoint or token)');
    this.name = 'AiGatewayNotConfiguredError';
  }
}

export class AiGatewayClient {
  private readonly endpoint: string | null;
  private readonly token: string | null;
  private readonly defaultModel: string;

  constructor(private readonly env: McpWorkerEnv) {
    this.endpoint = resolveGatewayEndpoint(env);
    this.token = env.CLOUDFLARE_AI_GATEWAY_TOKEN ?? null;
    this.defaultModel = env.DEFAULT_GEMINI_MODEL
      ? `google-ai-studio/${env.DEFAULT_GEMINI_MODEL}`
      : 'google-ai-studio/gemini-2.5-flash';
  }

  isConfigured(): boolean {
    return Boolean(this.endpoint && this.token);
  }

  /**
   * OpenAI-compatible chat completion via the AI Gateway unified endpoint.
   * Upstream provider auth (e.g. GEMINI_API_KEY) is forwarded as the request
   * `Authorization` header; the gateway itself is authed with `cf-aig-authorization`.
   */
  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
    if (!this.endpoint || !this.token) {
      throw new AiGatewayNotConfiguredError();
    }

    const model = request.model ?? this.defaultModel;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'cf-aig-authorization': `Bearer ${this.token}`,
    };

    const providerKey = this.providerKeyFor(model);
    if (providerKey) {
      headers.Authorization = `Bearer ${providerKey}`;
    }

    if (request.metadata) {
      headers['cf-aig-metadata'] = JSON.stringify(pruneMetadata(request.metadata));
    }
    if (request.cacheTtlSeconds && request.cacheTtlSeconds >= 60) {
      headers['cf-aig-cache-ttl'] = String(request.cacheTtlSeconds);
    }
    if (request.requestTimeoutMs) {
      headers['cf-aig-request-timeout'] = String(request.requestTimeoutMs);
    }

    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: request.messages,
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        ...(request.maxTokens !== undefined ? { max_tokens: request.maxTokens } : {}),
      }),
      signal: request.signal,
    });

    if (!response.ok) {
      const text = await safeReadText(response);
      throw new Error(`AI Gateway request failed (${response.status}): ${truncate(text, 500)}`);
    }

    const data = (await response.json()) as ChatCompletionApiResponse;
    return {
      content: data.choices?.[0]?.message?.content ?? '',
      model: data.model ?? model,
      cacheStatus: response.headers.get('cf-aig-cache-status'),
      usage: data.usage ?? null,
      raw: data,
    };
  }

  /** Select the upstream provider key by NAME based on the model prefix. */
  private providerKeyFor(model: string): string | undefined {
    if (model.startsWith('google-vertex') || model.startsWith('vertex')) {
      return this.env.VERTEX_API_KEY;
    }
    if (model.startsWith('google-ai-studio') || model.startsWith('gemini')) {
      return this.env.GEMINI_API_KEY;
    }
    return this.env.GEMINI_API_KEY ?? this.env.VERTEX_API_KEY;
  }
}

interface ChatCompletionApiResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

/**
 * Resolve the OpenAI-compatible base URL. Prefers an explicit
 * CLOUDFLARE_AI_GATEWAY_ENDPOINT; otherwise composes the provider-native compat
 * path from account + gateway ids.
 */
export function resolveGatewayEndpoint(env: McpWorkerEnv): string | null {
  if (env.CLOUDFLARE_AI_GATEWAY_ENDPOINT) {
    return env.CLOUDFLARE_AI_GATEWAY_ENDPOINT.replace(/\/$/, '');
  }
  if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_AI_GATEWAY_ID) {
    return `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.CLOUDFLARE_AI_GATEWAY_ID}/compat`;
  }
  return null;
}

function pruneMetadata(metadata: AiGatewayMetadata): Record<string, string> {
  // AI Gateway allows <= 5 metadata entries per request.
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value) {
      out[key] = value;
    }
  }
  return out;
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
