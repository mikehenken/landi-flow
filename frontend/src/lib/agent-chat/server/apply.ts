// Server-only module. Executes an (approved) MCP tool call. When the MCP worker
// is configured (MCP_WORKER_URL + session JWT or MCP_WORKER_TOKEN), the call is
// dispatched as a real JSON-RPC `tools/call` — where every WRITE flows through the
// Agent Action Bus server-side. Otherwise it mock-applies so the Agent Handoff
// Queue is functional end-to-end in dev without credentials.
import type { ApplyToolResponseBody } from '../protocol';
import { callMcpTool, isMcpWorkerConfigured } from './mcp-client';
import { enrichToolInputWithWorkspaceContext, type AgentWorkspaceContext } from './workspace-context';
import { TOOL_BY_NAME } from './mcp-catalogue';

export async function applyTool(params: {
  toolName: string;
  input: Record<string, unknown>;
  workspaceId?: string;
  authToken?: string | null;
  workspaceContext?: AgentWorkspaceContext | null;
}): Promise<ApplyToolResponseBody> {
  const { toolName, workspaceId, authToken, workspaceContext } = params;
  const def = TOOL_BY_NAME.get(toolName);
  if (!def) {
    return { ok: false, live: false, errorText: `Unknown tool: ${toolName}` };
  }

  const enrichedInput = enrichToolInputWithWorkspaceContext(
    toolName,
    params.input,
    workspaceContext,
  );
  const args = workspaceId
    ? { ...enrichedInput, workspace_id: workspaceId }
    : enrichedInput;

  if (isMcpWorkerConfigured(authToken)) {
    const result = await callMcpTool({ toolName, args, authToken });
    if (!result.ok) {
      return { ok: false, live: result.live, errorText: result.errorText };
    }
    return {
      ok: true,
      live: true,
      output: result.output,
      appliedText: `Applied **${def.title}** via the Agent Action Bus.`,
    };
  }

  // Mock apply (no MCP worker configured or no auth).
  return {
    ok: true,
    live: false,
    output: {
      applied: true,
      tool: toolName,
      note: 'Mock-applied (MCP not configured or no auth). Set MCP_WORKER_URL + sign in or MCP_WORKER_TOKEN for live writes.',
      input: enrichedInput,
    },
    appliedText: `${def.summarize(enrichedInput)} — mock-applied (live MCP unavailable).`,
  };
}
