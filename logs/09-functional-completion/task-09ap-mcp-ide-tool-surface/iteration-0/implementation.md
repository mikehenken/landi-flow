# task-09ap-mcp-ide-tool-surface — iteration 0

## Scope

MCP-IDE-001 — IDE MCP tools settings surface.

## Implementation

| Surface | File |
|---------|------|
| McpIdeToolsPanel | `frontend/src/components/mcp/mcp-ide-tools-panel.tsx` |
| Tool catalogue | `frontend/src/lib/mcp/mcp-tools-surface.ts` |
| Settings route | `frontend/src/app/[locale]/workspace/settings/mcp-tools/page.tsx` |

## Validation

```bash
pnpm run lint
pnpm --filter @landi-flow/frontend test:e2e -- mcp-ide-tool-surface.spec.ts
```
