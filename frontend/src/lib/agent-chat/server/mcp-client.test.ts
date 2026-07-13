import { describe, expect, it, vi, afterEach } from 'vitest';
import { callMcpTool } from './mcp-client';

describe('callMcpTool', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.MCP_WORKER_URL;
    delete process.env.MCP_WORKER_TOKEN;
  });

  it('returns ok:false when MCP result has isError', async () => {
    process.env.MCP_WORKER_URL = 'https://mcp.example.test';
    process.env.MCP_WORKER_TOKEN = 'test-token';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            isError: true,
            content: [{ type: 'text', text: 'invalid input syntax for type uuid: "team-design"' }],
          },
        }),
      }),
    );

    const result = await callMcpTool({
      toolName: 'story.update',
      args: { team_id: 'team-design', story_id: 'story-1' },
      authToken: 'session-jwt',
    });

    expect(result.ok).toBe(false);
    expect(result.live).toBe(true);
    expect(result.errorText).toContain('invalid input syntax for type uuid');
  });

  it('returns ok:true when MCP result succeeds', async () => {
    process.env.MCP_WORKER_URL = 'https://mcp.example.test';
    process.env.MCP_WORKER_TOKEN = 'test-token';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            content: [{ type: 'text', text: '{"ok":true}' }],
          },
        }),
      }),
    );

    const result = await callMcpTool({
      toolName: 'story.update',
      args: { team_id: 'uuid-team', story_id: 'uuid-story' },
      authToken: 'session-jwt',
    });

    expect(result.ok).toBe(true);
    expect(result.live).toBe(true);
  });
});
