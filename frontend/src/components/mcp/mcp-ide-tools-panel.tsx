'use client';

import * as React from 'react';
import { MCP_TOOL_SURFACE } from '@/lib/mcp/mcp-tools-surface';

/** MCP-IDE-001 — basic IDE tool surface listing MCP catalogue. */
export function McpIdeToolsPanel(): React.ReactElement {
  const readTools = MCP_TOOL_SURFACE.filter((tool) => !tool.isWrite);
  const writeTools = MCP_TOOL_SURFACE.filter((tool) => tool.isWrite);

  return (
    <div className="p-6 space-y-6" data-testid="mcp-ide-tools-panel">
      <header>
        <h1 className="text-lg font-semibold">IDE MCP tools</h1>
        <p className="text-sm text-muted-foreground">
          Tools available to Cursor, Claude Code, Antigravity, and OpenCode via MCP (MCP-IDE-001).
        </p>
      </header>

      <section data-testid="mcp-tools-read">
        <h2 className="text-sm font-semibold mb-2">Read tools ({readTools.length})</h2>
        <ul className="space-y-2">
          {readTools.map((tool) => (
            <li
              key={tool.name}
              className="rounded-md border border-border px-3 py-2"
              data-testid="mcp-tool-row"
            >
              <p className="text-sm font-medium font-mono">{tool.name}</p>
              <p className="text-xs text-muted-foreground">{tool.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section data-testid="mcp-tools-write">
        <h2 className="text-sm font-semibold mb-2">Write tools ({writeTools.length})</h2>
        <ul className="space-y-2">
          {writeTools.map((tool) => (
            <li
              key={tool.name}
              className="rounded-md border border-border px-3 py-2"
              data-testid="mcp-tool-row"
            >
              <p className="text-sm font-medium font-mono">{tool.name}</p>
              <p className="text-xs text-muted-foreground">{tool.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
