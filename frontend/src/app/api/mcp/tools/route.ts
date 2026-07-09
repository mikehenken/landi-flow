import { MCP_TOOL_SURFACE, type McpToolSurfaceEntry } from '@/lib/mcp/mcp-tools-surface';
import { isMockAuthEnabled } from '@/lib/api/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface McpToolsResponse {
  ok: boolean;
  tools: McpToolSurfaceEntry[];
  live: boolean;
  source: 'worker_mirror' | 'static_catalogue';
}

/** MCP-IDE-001 — tool catalogue for IDE settings surface (mirrors workers/mcp MCP_TOOLS). */
export async function GET(): Promise<Response> {
  const body: McpToolsResponse = {
    ok: true,
    tools: MCP_TOOL_SURFACE,
    live: !isMockAuthEnabled(),
    source: 'worker_mirror',
  };
  return Response.json(body);
}
