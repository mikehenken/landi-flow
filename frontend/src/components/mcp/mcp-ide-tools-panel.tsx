'use client';

import * as React from 'react';
import type { McpToolSurfaceEntry } from '@/lib/mcp/mcp-tools-surface';
import { MCP_TOOL_SURFACE } from '@/lib/mcp/mcp-tools-surface';

/** MCP-IDE-001 — basic IDE tool surface listing MCP catalogue from /api/mcp/tools. */
export function McpIdeToolsPanel(): React.ReactElement {
  const [tools, setTools] = React.useState<McpToolSurfaceEntry[]>(MCP_TOOL_SURFACE);
  const [live, setLive] = React.useState<boolean | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/mcp/tools');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json = (await response.json()) as {
          ok: boolean;
          tools: McpToolSurfaceEntry[];
          live: boolean;
        };
        if (!cancelled && json.ok && Array.isArray(json.tools)) {
          setTools(json.tools);
          setLive(json.live);
          setLoadError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load MCP tools');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const readTools = tools.filter((tool) => !tool.isWrite);
  const writeTools = tools.filter((tool) => tool.isWrite);

  return (
    <div className="p-6 space-y-6" data-testid="mcp-ide-tools-panel">
      <header>
        <h1 className="text-lg font-semibold">IDE MCP tools</h1>
        <p className="text-sm text-muted-foreground">
          Tools available to Cursor, Claude Code, Antigravity, and OpenCode via MCP (MCP-IDE-001).
        </p>
        {live !== null ? (
          <p className="text-xs text-muted-foreground mt-1" data-testid="mcp-tools-live-flag">
            Persistence: {live ? 'Workers + Supabase (live auth)' : 'Static catalogue (mock auth)'}
          </p>
        ) : null}
        {loadError ? (
          <p className="text-xs text-destructive mt-1" role="alert">
            {loadError} — showing offline catalogue.
          </p>
        ) : null}
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
