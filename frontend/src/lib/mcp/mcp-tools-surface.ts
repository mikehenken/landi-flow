/** Client-safe MCP tool catalogue mirror for MCP-IDE-001 IDE surface UI. */

export interface McpToolSurfaceEntry {
  name: string;
  title: string;
  description: string;
  isWrite: boolean;
}

export const MCP_TOOL_SURFACE: McpToolSurfaceEntry[] = [
  { name: 'flow.search', title: 'Search Stories', description: 'Full-text search Stories by title or identifier.', isWrite: false },
  { name: 'epic.list', title: 'List Epics', description: 'List active Epics in the workspace.', isWrite: false },
  { name: 'epic.get', title: 'Get Epic', description: 'Fetch a single Epic by id.', isWrite: false },
  { name: 'epic.create', title: 'Create Epic', description: 'Create an Epic planning container.', isWrite: true },
  { name: 'epic.update', title: 'Update Epic', description: 'Update fields on an existing Epic.', isWrite: true },
  { name: 'story.list', title: 'List Stories', description: 'List active Stories, optionally filtered by team.', isWrite: false },
  { name: 'story.get', title: 'Get Story', description: 'Fetch a single Story by id.', isWrite: false },
  { name: 'story.create', title: 'Create Story', description: 'Create a Story in a team.', isWrite: true },
  { name: 'story.update', title: 'Update Story', description: 'Update Story fields.', isWrite: true },
  { name: 'story.assign', title: 'Assign Story', description: 'Assign human or agent delegate.', isWrite: true },
  { name: 'epic.assign', title: 'Assign Epic', description: 'Assign lead or agent delegate on Epic.', isWrite: true },
  { name: 'story.decompose', title: 'Decompose Story', description: 'Split Story into sub-stories.', isWrite: true },
  { name: 'comment.create', title: 'Create Comment', description: 'Post comment on Story or Epic.', isWrite: true },
  { name: 'comment.reply', title: 'Reply to Comment', description: 'Thread reply on existing comment.', isWrite: true },
  { name: 'comment.create_as_proxy', title: 'Proxy Comment', description: 'Agent comment on behalf of human (MCP-IDE-002).', isWrite: true },
  { name: 'signal.attach', title: 'Attach Signal', description: 'Engineering signal with correlation id (MCP-IDE-003).', isWrite: true },
  { name: 'agent.list', title: 'List Agents', description: 'List assignable agent members.', isWrite: false },
  { name: 'members.list', title: 'List Members', description: 'Unified human + agent roster.', isWrite: false },
  { name: 'ai.draft_story', title: 'Draft Story with AI', description: 'AI-assisted Story draft (no silent write).', isWrite: false },
];
