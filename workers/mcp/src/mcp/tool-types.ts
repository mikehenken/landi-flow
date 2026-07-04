import type { McpPrincipal } from '../auth/authenticate.js';
import type { McpWorkerEnv } from '../env.js';
import type { AiGatewayClient } from '../ai/gateway.js';
import type { McpProjectService } from './mutations.js';

export interface ToolContext {
  service: McpProjectService;
  principal: McpPrincipal;
  gateway: AiGatewayClient;
  workspaceId: string;
  env: McpWorkerEnv;
}

export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  requiredScopes: string[];
  isWrite: boolean;
  handler: (ctx: ToolContext, args: Record<string, unknown>) => Promise<unknown>;
}

export class ToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolInputError';
  }
}
