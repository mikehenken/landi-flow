import type { Story } from '@landi-flow/core/types';
import { SEED_STORIES } from '@/lib/seed-data';
import { MOCK_BUILTIN_LANDI_FLOW_AGENT_ID } from '@/lib/agents/mock-roster';
import { isMockAuthEnabled } from '@/lib/agents/roster-client';
import { createServiceClientIfConfigured } from '@/lib/supabase/server';
import type { LinearCloneSupabaseClient } from '@landi-flow/auth';

export interface TriageProposal {
  storyId: string;
  storyIdentifier: string;
  title: string;
  actionId: string;
  summary: string;
  status: 'proposed';
}

export interface TriageProposeResult {
  ok: boolean;
  live: boolean;
  agentId: string | null;
  proposals: TriageProposal[];
  errorText?: string;
}

interface UntriagedStoryRow {
  id: string;
  identifier: string;
  title: string;
  assignee_id: string | null;
  delegate_agent_id: string | null;
}

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function isUntriagedStory(story: Story): boolean {
  return story.delegate_agent_id === null && story.assignee_id === null;
}

function mockProposals(workspaceId: string): TriageProposeResult {
  const untriaged = SEED_STORIES.filter(
    (story) => story.workspace_id === workspaceId && isUntriagedStory(story),
  );
  const proposals: TriageProposal[] = untriaged.slice(0, 3).map((story) => ({
    storyId: story.id,
    storyIdentifier: story.identifier,
    title: story.title,
    actionId: `mock-triage-${story.id}`,
    summary: `Propose assigning ${story.identifier} to Landi Flow Agent for inbox triage`,
    status: 'proposed',
  }));

  return {
    ok: true,
    live: false,
    agentId: MOCK_BUILTIN_LANDI_FLOW_AGENT_ID,
    proposals,
  };
}

/**
 * Native Landi Flow Agent triage loop (proposal-only — Handoff Queue, NOT auto-apply).
 */
export async function proposeInboxTriage(workspaceId: string): Promise<TriageProposeResult> {
  if (isMockAuthEnabled()) {
    return mockProposals(workspaceId);
  }

  const service = createServiceClientIfConfigured();
  if (!service) {
    return {
      ok: false,
      live: true,
      agentId: null,
      proposals: [],
      errorText: 'Supabase service client is not configured',
    };
  }

  const rpc = service as unknown as RpcClient;

  const { data: agentRow, error: agentError } = await rpc.rpc('ensure_builtin_landi_flow_agent', {
    p_workspace_id: workspaceId,
  });
  if (agentError || !agentRow) {
    return {
      ok: false,
      live: true,
      agentId: null,
      proposals: [],
      errorText: agentError?.message ?? 'Built-in agent not available',
    };
  }

  const agentRecord = agentRow as Record<string, unknown>;
  const agentId = typeof agentRecord.id === 'string' ? agentRecord.id : null;
  if (!agentId) {
    return {
      ok: false,
      live: true,
      agentId: null,
      proposals: [],
      errorText: 'Invalid built-in agent row',
    };
  }

  const db = service as LinearCloneSupabaseClient;
  const { data: stories, error: storiesError } = await db
    .from('stories')
    .select('id, identifier, title, assignee_id, delegate_agent_id')
    .eq('workspace_id', workspaceId)
    .is('delegate_agent_id', null)
    .is('assignee_id', null)
    .limit(5);

  if (storiesError) {
    return {
      ok: false,
      live: true,
      agentId,
      proposals: [],
      errorText: storiesError.message,
    };
  }

  const proposals: TriageProposal[] = [];
  const rows = (stories ?? []) as UntriagedStoryRow[];

  for (const story of rows) {
    const correlationId = crypto.randomUUID();
    const { data: mutation, error: mutationError } = await rpc.rpc('execute_agent_mutation', {
      p_op: 'assign_story',
      p_workspace_id: workspaceId,
      p_topic: 'entity.story.assigned',
      p_payload: { story_id: story.id, delegate_agent_id: agentId },
      p_correlation_id: correlationId,
      p_params: { story_id: story.id, delegate_agent_id: agentId },
      p_actor_agent_id: agentId,
      p_target_type: 'story',
      p_mutation_type: 'assign_story',
      p_auto_apply: false,
    });

    if (mutationError) {
      continue;
    }

    const result = mutation as Record<string, unknown> | null;
    const actionId =
      typeof result?.action_id === 'string' ? result.action_id : correlationId;

    proposals.push({
      storyId: story.id,
      storyIdentifier: story.identifier,
      title: story.title,
      actionId,
      summary: `Propose triage delegate for ${story.identifier}`,
      status: 'proposed',
    });
  }

  return {
    ok: true,
    live: true,
    agentId,
    proposals,
  };
}
