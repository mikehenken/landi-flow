// Server-only. Dispatches a single MCP JSON-RPC `tools/call` to the task-09d MCP
// worker, where every WRITE flows through the Agent Action Bus (proposal → apply with
// audit). When no worker is configured (MCP_WORKER_URL + MCP_WORKER_TOKEN), the call is
// mock-applied so the assign→act flow is demonstrable in dev without credentials.

export interface McpCallResult {
  ok: boolean;
  /** true when a live MCP worker executed the call; false when mock-applied. */
  live: boolean;
  tool: string;
  output?: unknown;
  errorText?: string;
}

export function isMcpWorkerConfigured(): boolean {
  return Boolean(process.env.MCP_WORKER_URL && process.env.MCP_WORKER_TOKEN);
}

export async function dispatchMcpTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<McpCallResult> {
  const workerUrl = process.env.MCP_WORKER_URL?.replace(/\/$/, '');
  const workerToken = process.env.MCP_WORKER_TOKEN;

  if (!workerUrl || !workerToken) {
    return {
      ok: true,
      live: false,
      tool: toolName,
      output: {
        applied: true,
        tool: toolName,
        args,
        note: 'Mock-applied (no MCP worker configured). Set MCP_WORKER_URL + MCP_WORKER_TOKEN for live Action Bus writes.',
      },
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
      return { ok: false, live: true, tool: toolName, errorText: `MCP worker returned ${response.status}` };
    }
    const body = (await response.json()) as { result?: unknown; error?: { message?: string } };
    if (body.error) {
      return { ok: false, live: true, tool: toolName, errorText: body.error.message ?? 'MCP tool error' };
    }
    return { ok: true, live: true, tool: toolName, output: body.result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'MCP dispatch failed';
    return { ok: false, live: true, tool: toolName, errorText: message };
  }
}
