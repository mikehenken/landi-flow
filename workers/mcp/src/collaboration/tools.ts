/**
 * MCP collaboration tools — agent room join + typing broadcast (task-09h).
 * Presence uses Liveblocks setPresence; structured writes still use the Action Bus.
 */
import { buildStoryRoomId } from '@landi-flow/collaboration';
import type { McpWorkerEnv } from '../env.js';
import type { McpPrincipal } from '../auth/authenticate.js';
import type { McpProjectService } from '../mcp/mutations.js';
import { MCP_SCOPES } from '../auth/scopes.js';
import { ToolInputError, type ToolDefinition } from '../mcp/tool-types.js';
import {
  broadcastAgentTyping,
  joinAgentStoryRoom,
  refreshAgentStoryPresenceForTool,
} from './agent-room.js';

function str(args: Record<string, unknown>, key: string): string | undefined {
  const v = args[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function requireStr(args: Record<string, unknown>, key: string): string {
  const v = str(args, key);
  if (!v) {
    throw new ToolInputError(`Missing required string argument: ${key}`);
  }
  return v;
}

const STRING = { type: 'string' } as const;

async function resolveStoryUuid(
  service: McpProjectService,
  storyRef: string
): Promise<string> {
  const story = (await service.getStory(storyRef)) as { id?: string } | null;
  if (!story?.id) {
    throw new ToolInputError(`Story not found: ${storyRef}`);
  }
  return story.id;
}

async function resolveAgentDisplayName(
  service: McpProjectService,
  agentId: string
): Promise<{ displayName: string; avatarUrl: string }> {
  const agents = (await service.listAgents()) as Array<{
    id: string;
    display_name: string;
    icon_url: string | null;
  }>;
  const agent = agents.find((row) => row.id === agentId);
  return {
    displayName: agent?.display_name ?? `Agent ${agentId.slice(0, 8)}`,
    avatarUrl: agent?.icon_url ?? '',
  };
}

function requireAgentId(principal: McpPrincipal, args: Record<string, unknown>): string {
  const agentId = principal.agentId ?? str(args, 'agent_id');
  if (!agentId) {
    throw new ToolInputError(
      'Agent credential required — bind an agent_id to the MCP credential or pass agent_id'
    );
  }
  return agentId;
}

export const COLLABORATION_TOOLS: ToolDefinition[] = [
  {
    name: 'collab.join_story_room',
    title: 'Join Story Collaboration Room',
    description:
      'Join a Story Liveblocks room as an AI agent. Sets ephemeral presence so humans see the agent in useOthers(). Does not write story data — use story.* tools for mutations.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: STRING,
        story_id: { ...STRING, description: 'Story UUID or identifier (e.g. ENG-42)' },
        surface: { ...STRING, description: 'Editing surface hint (default: story)' },
        ttl_seconds: {
          type: 'integer',
          minimum: 2,
          maximum: 3599,
          description: 'Presence TTL in seconds (default 120)',
        },
      },
      required: ['story_id'],
    },
    requiredScopes: [MCP_SCOPES.READ],
    isWrite: false,
    handler: async ({ service, principal, workspaceId, env }, args) => {
      const agentId = requireAgentId(principal, args);
      const storyUuid = await resolveStoryUuid(service, requireStr(args, 'story_id'));
      const { displayName, avatarUrl } = await resolveAgentDisplayName(service, agentId);

      const result = await joinAgentStoryRoom(
        env,
        {
          workspaceId,
          storyId: storyUuid,
          agentId,
          agentDisplayName: displayName,
          agentAvatarUrl: avatarUrl,
        },
        {
          surface: str(args, 'surface') ?? 'story',
          ttlSeconds:
            typeof args.ttl_seconds === 'number' ? Math.trunc(args.ttl_seconds) : undefined,
        }
      );

      if (!result) {
        throw new ToolInputError(
          'Liveblocks is not configured (LIVEBLOCKS_SECRET_KEY missing on MCP worker)'
        );
      }

      return {
        room_id: result.roomId,
        agent_user_id: result.userInfo.id,
        joined: result.joined,
        presence_ttl_seconds: result.presenceTtlSeconds,
        note: 'Structured story writes still route through story.* MCP tools and the Action Bus.',
      };
    },
  },
  {
    name: 'collab.broadcast_typing',
    title: 'Broadcast Agent Typing',
    description:
      'Emit an ephemeral agent_typing event to Story room peers (non-persistent toast signal).',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: STRING,
        story_id: STRING,
        surface: { ...STRING, description: 'Surface being edited (default: story)' },
      },
      required: ['story_id'],
    },
    requiredScopes: [MCP_SCOPES.READ],
    isWrite: false,
    handler: async ({ service, principal, workspaceId, env }, args) => {
      const agentId = requireAgentId(principal, args);
      const storyUuid = await resolveStoryUuid(service, requireStr(args, 'story_id'));
      const roomId = buildStoryRoomId(workspaceId, storyUuid);
      const surface = str(args, 'surface') ?? 'story';

      await broadcastAgentTyping(env, roomId, agentId, surface);

      return { room_id: roomId, agent_id: agentId, surface, broadcast: true };
    },
  },
];

const STORY_SCOPED_TOOL_PREFIXES = ['story.', 'comment.'] as const;

/** After a successful story/comment tool call, refresh agent presence when Liveblocks is configured. */
export async function maybeRefreshAgentPresenceAfterTool(
  env: McpWorkerEnv,
  principal: McpPrincipal,
  workspaceId: string,
  service: McpProjectService,
  toolName: string,
  args: Record<string, unknown>
): Promise<void> {
  if (!principal.agentId || !env.LIVEBLOCKS_SECRET_KEY) {
    return;
  }

  const isStoryScoped = STORY_SCOPED_TOOL_PREFIXES.some((prefix) => toolName.startsWith(prefix));
  if (!isStoryScoped) {
    return;
  }

  const storyRef = str(args, 'story_id') ?? str(args, 'story');
  if (!storyRef) {
    return;
  }

  try {
    const storyUuid = await resolveStoryUuid(service, storyRef);
    const { displayName, avatarUrl } = await resolveAgentDisplayName(service, principal.agentId);

    await refreshAgentStoryPresenceForTool(
      env,
      {
        workspaceId,
        storyId: storyUuid,
        agentId: principal.agentId,
        agentDisplayName: displayName,
        agentAvatarUrl: avatarUrl,
      },
      toolName
    );
  } catch {
    // Presence refresh is best-effort; never fail the tool response.
  }
}
