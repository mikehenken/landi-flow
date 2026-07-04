/**
 * MCP Streamable HTTP endpoint — JSON-RPC 2.0 over POST /mcp.
 * Implements: initialize, notifications/initialized, ping, tools/list, tools/call.
 * Authorization is enforced at the tool layer (scopes + read-only + workspace access)
 * BEFORE any handler runs, and all writes flow through the Agent Action Bus.
 */
import type { DbClient } from '../lib/db.js';
import { jsonResponse } from '../lib/http.js';
import { recordCredentialAudit } from '../lib/audit.js';
import type { McpPrincipal } from '../auth/authenticate.js';
import { resolveWorkspaceId } from '../auth/authenticate.js';
import type { AiGatewayClient } from '../ai/gateway.js';
import { McpAuthorizationError, McpProjectService } from './mutations.js';
import { TOOLS_BY_NAME, ToolInputError, toolListForClient } from './tools.js';
import { maybeRefreshAgentPresenceAfterTool } from '../collaboration/tools.js';
import type { McpWorkerEnv } from '../env.js';

const MCP_PROTOCOL_VERSION = '2025-06-18';
const SERVER_INFO = { name: 'landi-flow-mcp', version: '0.1.0' };

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface McpServerContext {
  db: DbClient;
  principal: McpPrincipal;
  gateway: AiGatewayClient;
  env: McpWorkerEnv;
  resourceUri: string;
  correlationId: string;
  request: Request;
}

export async function handleMcpPost(ctx: McpServerContext): Promise<Response> {
  let payload: unknown;
  try {
    payload = await ctx.request.json();
  } catch {
    return jsonResponse(rpcError(null, -32700, 'Parse error'), 200);
  }

  if (Array.isArray(payload)) {
    const responses = [];
    for (const item of payload) {
      const result = await dispatch(ctx, item as JsonRpcRequest);
      if (result !== null) {
        responses.push(result);
      }
    }
    return jsonResponse(responses, 200);
  }

  const result = await dispatch(ctx, payload as JsonRpcRequest);
  // Notifications (no id) get a 202 with no body.
  if (result === null) {
    return new Response(null, { status: 202 });
  }
  return jsonResponse(result, 200);
}

async function dispatch(
  ctx: McpServerContext,
  req: JsonRpcRequest
): Promise<Record<string, unknown> | null> {
  if (!req || req.jsonrpc !== '2.0' || typeof req.method !== 'string') {
    return rpcError(req?.id ?? null, -32600, 'Invalid Request');
  }

  const isNotification = req.id === undefined || req.id === null;

  switch (req.method) {
    case 'initialize':
      return rpcResult(req.id ?? null, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });

    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null;

    case 'ping':
      return rpcResult(req.id ?? null, {});

    case 'tools/list':
      return rpcResult(req.id ?? null, { tools: toolListForClient() });

    case 'tools/call':
      return handleToolCall(ctx, req);

    default:
      if (isNotification) {
        return null;
      }
      return rpcError(req.id ?? null, -32601, `Method not found: ${req.method}`);
  }
}

async function handleToolCall(
  ctx: McpServerContext,
  req: JsonRpcRequest
): Promise<Record<string, unknown>> {
  const id = req.id ?? null;
  const params = req.params ?? {};
  const toolName = typeof params.name === 'string' ? params.name : '';
  const args = (params.arguments as Record<string, unknown>) ?? {};

  const tool = TOOLS_BY_NAME.get(toolName);
  if (!tool) {
    return rpcError(id, -32602, `Unknown tool: ${toolName}`);
  }

  // Scope enforcement (tool layer).
  const scopeSet = new Set(ctx.principal.scopes);
  const missing = tool.requiredScopes.filter((s) => !scopeSet.has(s));
  if (missing.length > 0) {
    await auditDenied(ctx, toolName, `missing_scopes:${missing.join(',')}`);
    return rpcError(id, -32001, `Insufficient scope for ${toolName}. Missing: ${missing.join(', ')}`);
  }

  // Read-only credential can never invoke a write tool.
  if (tool.isWrite && ctx.principal.readonly) {
    await auditDenied(ctx, toolName, 'readonly_credential');
    return rpcError(id, -32001, `Read-only credential cannot invoke write tool ${toolName}`);
  }

  // Resolve + authorize workspace.
  const workspaceId = resolveWorkspaceId(
    ctx.principal,
    typeof args.workspace_id === 'string' ? args.workspace_id : null
  );
  if (!workspaceId) {
    return toolError(id, 'workspace_id is required (credential is not workspace-bound)');
  }

  const service = new McpProjectService(ctx.db, ctx.principal, workspaceId, ctx.correlationId);
  try {
    await service.assertWorkspaceAccess();
  } catch (err) {
    if (err instanceof McpAuthorizationError) {
      await auditDenied(ctx, toolName, 'workspace_access_denied');
      return rpcError(id, -32001, err.message);
    }
    throw err;
  }

  try {
    const output = await tool.handler(
      { service, principal: ctx.principal, gateway: ctx.gateway, workspaceId, env: ctx.env },
      args
    );
    await maybeRefreshAgentPresenceAfterTool(
      ctx.env,
      ctx.principal,
      workspaceId,
      service,
      toolName,
      args
    );
    await recordCredentialAudit(ctx.db, {
      event: 'used',
      workspaceId,
      actorId: ctx.principal.userId,
      credentialId: ctx.principal.credentialId ?? null,
      credentialKind: ctx.principal.type,
      request: ctx.request,
      detail: { tool: toolName },
    });
    return rpcResult(id, {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      structuredContent: output as Record<string, unknown>,
      isError: false,
    });
  } catch (err) {
    if (err instanceof ToolInputError || err instanceof McpAuthorizationError) {
      return toolError(id, err.message);
    }
    const message = err instanceof Error ? err.message : 'Tool execution failed';
    return toolError(id, message);
  }
}

async function auditDenied(ctx: McpServerContext, tool: string, reason: string): Promise<void> {
  await recordCredentialAudit(ctx.db, {
    event: 'denied',
    workspaceId: ctx.principal.workspaceId,
    actorId: ctx.principal.userId,
    credentialId: ctx.principal.credentialId ?? null,
    credentialKind: ctx.principal.type,
    request: ctx.request,
    detail: { tool, reason },
  });
}

function rpcResult(id: string | number | null, result: unknown): Record<string, unknown> {
  return { jsonrpc: '2.0', id, result };
}

function rpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): Record<string, unknown> {
  const error: JsonRpcError = { code, message, ...(data !== undefined ? { data } : {}) };
  return { jsonrpc: '2.0', id, error };
}

/** Tool execution failure — surfaced as an isError result, not a protocol error. */
function toolError(id: string | number | null, message: string): Record<string, unknown> {
  return rpcResult(id, {
    content: [{ type: 'text', text: message }],
    isError: true,
  });
}
