/**

 * Server-side Liveblocks agent room participation.

 * Agents appear in useOthers() with actorType:"agent" per task-05d.

 */

import { Liveblocks } from '@liveblocks/node';

import {

  buildStoryRoomId,

  workspaceRoomWildcard,

  type CollabPresence,

  type CollabUserMeta,

} from '@landi-flow/collaboration';

import type { McpWorkerEnv } from '../env.js';



export interface AgentRoomSessionInput {

  workspaceId: string;

  storyId: string;

  agentId: string;

  agentDisplayName: string;

  agentAvatarUrl?: string;

}



export interface AgentRoomTokenResult {

  roomId: string;

  token: string;

  userInfo: CollabUserMeta;

}



export interface AgentRoomJoinResult extends AgentRoomTokenResult {

  joined: true;

  presenceTtlSeconds: number;

}



function getLiveblocks(env: McpWorkerEnv): Liveblocks | null {

  const secret = env.LIVEBLOCKS_SECRET_KEY;

  if (!secret) {

    return null;

  }

  return new Liveblocks({ secret });

}



/** Mint a scoped access token for an MCP agent to join a Story room. */

export async function mintAgentRoomToken(

  env: McpWorkerEnv,

  input: AgentRoomSessionInput

): Promise<AgentRoomTokenResult | null> {

  const liveblocks = getLiveblocks(env);

  if (!liveblocks) {

    return null;

  }



  const roomId = buildStoryRoomId(input.workspaceId, input.storyId);

  const appUserId = `agent:${input.agentId}`;



  const userInfo: CollabUserMeta = {

    id: appUserId,

    name: input.agentDisplayName,

    avatarUrl: input.agentAvatarUrl ?? '',

    actorType: 'agent',

    agentId: input.agentId,

  };



  await liveblocks.getOrCreateRoom(roomId, {

    defaultAccesses: [],

    usersAccesses: {

      [appUserId]: ['room:write'],

    },

    metadata: {

      workspaceId: input.workspaceId,

      entityType: 'story',

      agentEligible: 'true',

    },

  });



  const session = liveblocks.prepareSession(appUserId, {

    userInfo: {

      ...userInfo,

    } as Record<string, string | undefined>,

  });



  session.allow(roomId, ['room:write', 'comments:write']);



  const { body, status } = await session.authorize();

  if (status !== 200) {

    return null;

  }



  const parsed = JSON.parse(body) as { token: string };



  return {

    roomId,

    token: parsed.token,

    userInfo,

  };

}



/** Wildcard grant pattern for agent_team_access rooms (default-off, scoped). */

export function agentRoomWildcard(workspaceId: string): string {

  return workspaceRoomWildcard(workspaceId);

}



function defaultAgentPresence(storyId: string, surface: string): CollabPresence {

  return {

    cursorX: null,

    cursorY: null,

    selectionFieldId: null,

    selectionCardId: null,

    editingSurface: surface,

    editingTarget: storyId,

  };

}



/**

 * Set ephemeral server-side presence so the agent appears in human clients'

 * `useOthers()` without a persistent WebSocket (Liveblocks setPresence API).

 */

export async function setAgentStoryPresence(

  env: McpWorkerEnv,

  input: AgentRoomSessionInput,

  options?: { surface?: string; ttlSeconds?: number; presence?: Partial<CollabPresence> }

): Promise<boolean> {

  const liveblocks = getLiveblocks(env);

  if (!liveblocks) {

    return false;

  }



  const roomId = buildStoryRoomId(input.workspaceId, input.storyId);

  const appUserId = `agent:${input.agentId}`;

  const surface = options?.surface ?? 'story';

  const ttl = options?.ttlSeconds ?? 120;



  const presence: CollabPresence = {

    ...defaultAgentPresence(input.storyId, surface),

    ...options?.presence,

  };



  await liveblocks.setPresence(roomId, {

    userId: appUserId,

    data: presence as unknown as Record<string, string | number | boolean | null>,

    userInfo: {

      id: appUserId,

      name: input.agentDisplayName,

      avatarUrl: input.agentAvatarUrl ?? '',

      actorType: 'agent',

      agentId: input.agentId,

    },

    ttl,

  });



  return true;

}



/**

 * Mint room ACL + set ephemeral presence — the exercised end-to-end agent join path.

 * Structured writes still route through the Action Bus; this is presence-only.

 */

export async function joinAgentStoryRoom(

  env: McpWorkerEnv,

  input: AgentRoomSessionInput,

  options?: { surface?: string; ttlSeconds?: number }

): Promise<AgentRoomJoinResult | null> {

  const tokenResult = await mintAgentRoomToken(env, input);

  if (!tokenResult) {

    return null;

  }



  const ttlSeconds = options?.ttlSeconds ?? 120;

  const presenceSet = await setAgentStoryPresence(env, input, {

    surface: options?.surface,

    ttlSeconds,

  });



  if (!presenceSet) {

    return null;

  }



  return {

    ...tokenResult,

    joined: true,

    presenceTtlSeconds: ttlSeconds,

  };

}



/** Broadcast agent processing state to room peers (non-persistent). */

export async function broadcastAgentTyping(

  env: McpWorkerEnv,

  roomId: string,

  agentId: string,

  surface: string

): Promise<void> {

  const liveblocks = getLiveblocks(env);

  if (!liveblocks) {

    return;

  }



  await liveblocks.broadcastEvent(roomId, {

    type: 'agent_typing',

    agentId,

    surface,

  });

}



/** Refresh agent presence TTL while an MCP tool run touches a story (lifecycle hook). */

export async function refreshAgentStoryPresenceForTool(

  env: McpWorkerEnv,

  input: AgentRoomSessionInput,

  toolName: string

): Promise<void> {

  const surface = toolName.startsWith('comment.') ? 'comments' : 'story';

  await setAgentStoryPresence(env, input, { surface, ttlSeconds: 120 });

  const roomId = buildStoryRoomId(input.workspaceId, input.storyId);

  await broadcastAgentTyping(env, roomId, input.agentId, surface);

}


