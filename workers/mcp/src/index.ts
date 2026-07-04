/**
 * MCP Worker — Streamable HTTP `/mcp`
 * MCP-IDE-001: story.create, story.decompose, epic.create
 * MCP-IDE-002: comment.create, comment.reply, comment.create_as_proxy
 * MCP-IDE-003: engineering signals (via webhook normalization)
 *
 * All MCP writes → agent_action_outbox (proposed) → single-writer apply → outbox_events.
 * Implemented in Phase 09d.
 */
export default {
  async fetch(): Promise<Response> {
    return new Response(
      JSON.stringify({ service: 'landi-flow-mcp', status: 'scaffold' }),
      { headers: { 'content-type': 'application/json' } }
    );
  },
};
