// Server-only module. Executes an (approved) MCP tool call. When the MCP worker
// is configured (MCP_WORKER_URL + MCP_WORKER_TOKEN, task-09d), the call is
// dispatched as a real JSON-RPC `tools/call` — where every WRITE flows through the
// Agent Action Bus server-side. Otherwise it mock-applies so the Agent Handoff
// Queue is functional end-to-end in dev without credentials.
import type { ApplyToolResponseBody } from '../protocol';
import { TOOL_BY_NAME } from './mcp-catalogue';

export async function applyTool(params: {
  toolName: string;
  input: Record<string, unknown>;
  workspaceId?: string;
}): Promise<ApplyToolResponseBody> {
  const { toolName, input, workspaceId } = params;
  const def = TOOL_BY_NAME.get(toolName);
  if (!def) {
    return { ok: false, live: false, errorText: `Unknown tool: ${toolName}` };
  }

  const workerUrl = process.env.MCP_WORKER_URL?.replace(/\/$/, '');
  const workerToken = process.env.MCP_WORKER_TOKEN;

  if (workerUrl && workerToken) {
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
          params: {
            name: toolName,
            arguments: workspaceId ? { ...input, workspace_id: workspaceId } : input,
          },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        return {
          ok: false,
          live: true,
          errorText: `MCP worker returned ${response.status}`,
        };
      }
      const body = (await response.json()) as {
        result?: unknown;
        error?: { message?: string };
      };
      if (body.error) {
        return { ok: false, live: true, errorText: body.error.message ?? 'MCP tool error' };
      }
      return {
        ok: true,
        live: true,
        output: body.result,
        appliedText: `Applied **${def.title}** via the Agent Action Bus.`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'MCP dispatch failed';
      return { ok: false, live: true, errorText: message };
    }
  }

  // Mock apply (no MCP worker configured).
  return {
    ok: true,
    live: false,
    output: {
      applied: true,
      tool: toolName,
      note: 'Mock-applied (no MCP worker configured). Configure MCP_WORKER_URL + MCP_WORKER_TOKEN for live writes.',
      input,
    },
    appliedText: `${def.summarize(input)} — mock-applied (no live MCP worker configured).`,
  };
}
