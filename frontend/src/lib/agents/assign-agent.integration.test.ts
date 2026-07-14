import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { assignAndAct } from './assign-agent';

describe('assignAndAct (Action Bus integration)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.MCP_WORKER_URL;
    delete process.env.MCP_WORKER_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('assigns story via mock Action Bus when worker not configured', async () => {
    const result = await assignAndAct({
      entity: 'story',
      entityId: 'story-001',
      workspaceId: 'ws-demo',
      delegateAgentId: 'agent-landi-flow-builtin',
      entityLabel: 'LAN-1',
    });

    expect(result.ok).toBe(true);
    expect(result.live).toBe(false);
    expect(result.steps.map((s) => s.tool)).toEqual([
      'story.assign',
      'comment.create',
      'signal.attach',
    ]);
    expect(result.steps.every((s) => s.ok)).toBe(true);
  });

  it('dispatches only assign when clearing agent delegate', async () => {
    const result = await assignAndAct({
      entity: 'story',
      entityId: 'story-001',
      delegateAgentId: null,
      humanId: 'user-jane',
    });

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]?.tool).toBe('story.assign');
  });

  it('includes epic.assign for epic entity', async () => {
    const result = await assignAndAct({
      entity: 'epic',
      entityId: 'epic-001',
      delegateAgentId: 'agent-1',
    });

    expect(result.steps[0]?.tool).toBe('epic.assign');
    expect(result.steps.some((s) => s.tool === 'signal.attach')).toBe(false);
  });
});
