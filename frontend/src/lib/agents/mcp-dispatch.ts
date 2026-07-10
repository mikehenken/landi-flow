// Server-only. Dispatches a single MCP JSON-RPC `tools/call` to the task-09d MCP
// worker, where every WRITE flows through the Agent Action Bus (proposal → apply with
// audit). Re-exports the shared MCP client used by agent chat apply + assign flows.

export type { McpCallResult } from '@/lib/agent-chat/server/mcp-client';
export {
  callMcpTool,
  isMcpWorkerConfigured,
  resolveMcpAuthToken,
  resolveMcpWorkerUrl,
} from '@/lib/agent-chat/server/mcp-client';

import { callMcpTool } from '@/lib/agent-chat/server/mcp-client';

/** Back-compat wrapper for assign-agent and other callers using positional args. */
export async function dispatchMcpTool(
  toolName: string,
  args: Record<string, unknown>,
  authToken?: string | null,
) {
  return callMcpTool({ toolName, args, authToken });
}
