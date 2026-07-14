// Server-only. Shared MCP JSON-RPC `tools/call` dispatcher for the Agent Action Bus.
// Auth: prefer the caller's Supabase session JWT; fall back to MCP_WORKER_TOKEN for
// server-to-server paths (assign-agent, CI). When MCP_WORKER_URL is unset, callers
// receive a mock-applied result so dev/demo flows work without credentials.

export interface McpCallResult {
  ok: boolean;
  /** true when a live MCP worker executed the call; false when mock-applied. */
  live: boolean;
  tool: string;
  output?: unknown;
  errorText?: string;
}

interface McpJsonRpcResponse {
  result?: McpToolCallResult;
  error?: { message?: string };
}

interface McpToolCallResult {
  content?: Array<{ type?: string; text?: string }>;
  structuredContent?: unknown;
  isError?: boolean;
}

export function resolveMcpWorkerUrl(): string | null {
  const raw = process.env.MCP_WORKER_URL ?? process.env.NEXT_PUBLIC_MCP_URL;
  return raw ? raw.replace(/\/$/, '') : null;
}

export function resolveMcpAuthToken(sessionToken?: string | null): string | null {
  const token = sessionToken ?? process.env.MCP_WORKER_TOKEN ?? null;
  return token && token.length > 0 ? token : null;
}

/** True when a live MCP call can be attempted (URL + auth available). */
export function isMcpWorkerConfigured(sessionToken?: string | null): boolean {
  return Boolean(resolveMcpWorkerUrl() && resolveMcpAuthToken(sessionToken));
}

function extractMcpErrorText(result: McpToolCallResult): string {
  const first = result.content?.[0];
  if (first && typeof first.text === 'string' && first.text.length > 0) {
    return first.text;
  }
  return 'MCP tool returned isError without a message';
}

export async function callMcpTool(params: {
  toolName: string;
  args: Record<string, unknown>;
  authToken?: string | null;
}): Promise<McpCallResult> {
  const { toolName, args, authToken } = params;
  const workerUrl = resolveMcpWorkerUrl();
  const workerToken = resolveMcpAuthToken(authToken);

  if (!workerUrl) {
    return {
      ok: true,
      live: false,
      tool: toolName,
      output: {
        applied: true,
        tool: toolName,
        args,
        note: 'Mock-applied (MCP_WORKER_URL not configured). Set MCP_WORKER_URL for live Action Bus writes.',
      },
    };
  }

  if (!workerToken) {
    return {
      ok: false,
      live: false,
      tool: toolName,
      errorText:
        'MCP worker URL is configured but no auth token is available. Sign in or set MCP_WORKER_TOKEN.',
    };
  }

  try {
    const response = await fetch(`${workerUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: crypto.randomUUID(),
        method: 'tools/call',
        params: { name: toolName, arguments: args },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      return {
        ok: false,
        live: true,
        tool: toolName,
        errorText: `MCP worker returned ${response.status}`,
      };
    }
    const body = (await response.json()) as McpJsonRpcResponse;
    if (body.error) {
      return {
        ok: false,
        live: true,
        tool: toolName,
        errorText: body.error.message ?? 'MCP tool error',
      };
    }

    const result = body.result;
    if (result?.isError === true) {
      return {
        ok: false,
        live: true,
        tool: toolName,
        errorText: extractMcpErrorText(result),
      };
    }

    return { ok: true, live: true, tool: toolName, output: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'MCP dispatch failed';
    return { ok: false, live: true, tool: toolName, errorText: message };
  }
}
