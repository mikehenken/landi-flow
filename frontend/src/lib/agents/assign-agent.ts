// Server-only. Orchestrates the study's acceptance flow for task-09k:
//   "assign an agent to a Story (or Epic) and have it ACT via the MCP Action Bus."
//
// 1. The assignment itself is a governed write: `story.assign` / `epic.assign` route
//    through the Agent Action Bus (proposal → apply, audited) in the MCP worker.
// 2. When an AGENT is assigned as the delegate, it immediately acts as a first-class
//    member — posting a pick-up comment and attaching a "started" engineering signal,
//    both through the Action Bus — so the agent behaves like a human developer who was
//    just assigned a ticket.

import { dispatchMcpTool, isMcpWorkerConfigured, type McpCallResult } from './mcp-dispatch';

export type AssignEntity = 'story' | 'epic';

export interface AssignAgentRequest {
  entity: AssignEntity;
  entityId: string;
  workspaceId?: string;
  /** Agent (delegate) being assigned. When set, the agent then acts via the Action Bus. */
  delegateAgentId?: string | null;
  /** Human owner: assignee for a Story, lead for an Epic. */
  humanId?: string | null;
  /** Human-readable entity label used in the agent's pick-up comment. */
  entityLabel?: string;
}

export interface AssignAgentResult {
  ok: boolean;
  live: boolean;
  /** The ordered Action Bus calls that were dispatched (assign, then act). */
  steps: McpCallResult[];
  errorText?: string;
}

function withWorkspace(
  args: Record<string, unknown>,
  workspaceId?: string,
): Record<string, unknown> {
  return workspaceId ? { ...args, workspace_id: workspaceId } : args;
}

export async function assignAndAct(req: AssignAgentRequest): Promise<AssignAgentResult> {
  const steps: McpCallResult[] = [];
  const live = isMcpWorkerConfigured();

  // Step 1 — assignment (Action Bus governed write).
  const assignTool = req.entity === 'story' ? 'story.assign' : 'epic.assign';
  const assignArgs: Record<string, unknown> =
    req.entity === 'story'
      ? { story_id: req.entityId }
      : { epic_id: req.entityId };

  if (req.delegateAgentId !== undefined) {
    if (req.delegateAgentId === null) {
      assignArgs.unassign_agent = true;
    } else {
      assignArgs.delegate_agent_id = req.delegateAgentId;
    }
  }
  if (req.humanId !== undefined) {
    if (req.entity === 'story') {
      if (req.humanId === null) {
        assignArgs.unassign_assignee = true;
      } else {
        assignArgs.assignee_id = req.humanId;
      }
    } else if (req.humanId === null) {
      assignArgs.unassign_lead = true;
    } else {
      assignArgs.lead_id = req.humanId;
    }
  }

  const assignStep = await dispatchMcpTool(assignTool, withWorkspace(assignArgs, req.workspaceId));
  steps.push(assignStep);
  if (!assignStep.ok) {
    return { ok: false, live, steps, errorText: assignStep.errorText };
  }

  // Step 2 — the assigned AGENT acts (only when an agent was actually assigned).
  if (req.delegateAgentId) {
    const label = req.entityLabel ?? (req.entity === 'story' ? 'this Story' : 'this Epic');
    const target =
      req.entity === 'story' ? { story_id: req.entityId } : { epic_id: req.entityId };

    const commentStep = await dispatchMcpTool(
      'comment.create',
      withWorkspace(
        {
          ...target,
          body_md: `👋 Picking up ${label} — I'll start working on it and post progress here.`,
        },
        req.workspaceId,
      ),
    );
    steps.push(commentStep);

    // Stories additionally get an engineering "started" signal (MCP-IDE-003).
    if (req.entity === 'story') {
      const signalStep = await dispatchMcpTool(
        'signal.attach',
        withWorkspace(
          {
            ...target,
            signal: {
              kind: 'agent_lifecycle',
              status: 'started',
              source: 'assignment',
              correlation_id: crypto.randomUUID(),
            },
          },
          req.workspaceId,
        ),
      );
      steps.push(signalStep);
    }
  }

  const ok = steps.every((s) => s.ok);
  return { ok, live, steps, errorText: ok ? undefined : 'One or more Action Bus steps failed' };
}
