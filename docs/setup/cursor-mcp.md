# Cursor MCP — Landi Flow (`landi-flow-mcp`)

Connect Cursor (or any Streamable HTTP MCP client) to the Landi Flow MCP worker for Epic/Story lifecycle tools, agent roster, collaboration presence, and AI draft assistance.

## Worker surfaces

| Route | Purpose |
|-------|---------|
| `GET /` | Health + configured env key **names** (no values) |
| `POST /mcp` | Streamable HTTP JSON-RPC (`initialize`, `tools/list`, `tools/call`) |
| `POST /api/mcp/keys` | Issue personal API key (`lcf_sk_*`) |
| `/.well-known/oauth-*` | OAuth 2.1 + RFC 8707 discovery |

Package: `workers/mcp` (`@landi-flow/mcp-worker`).

## Local dev

### 1. Sync secrets into Wrangler (gitignored)

```bash
node scripts/sync-mcp-dev-vars.mjs
```

Copies Supabase + MCP keys from repo-root `.env.local` → `workers/mcp/.dev.vars`.

### 2. Start the MCP worker

```bash
pnpm --filter @landi-flow/mcp-worker dev
```

Default URL: **http://127.0.0.1:8787/mcp**

### 3. Issue a personal API key

Sign in to Supabase (human session), then:

```bash
curl -X POST http://127.0.0.1:8787/api/mcp/keys \
  -H "Authorization: Bearer <supabase-access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"<uuid>","name":"cursor-local","scopes":["read","write","stories:create","stories:write","epics:create","epics:write","comments:create","signals:write","app:assignable","app:mentionable"]}'
```

The response includes `plaintext_key` (`lcf_sk_…`) **once**. Store it in your shell env:

```powershell
$env:LANDI_FLOW_MCP_TOKEN = "lcf_sk_..."
```

Or run the automated matrix (issues a key, tests all tools):

```bash
node scripts/issue-mcp-dev-key.mjs --connect-agent   # agent-bound key for collab.* tools
$env:LANDI_FLOW_MCP_TOKEN = (node scripts/issue-mcp-dev-key.mjs --connect-agent | Select-Object -Last 1)
node scripts/test-mcp-tools.mjs --token $env:LANDI_FLOW_MCP_TOKEN --report logs/mcp-tool-test-report.md
```

### 4. Workspace Cursor config

File: `.cursor/mcp.json` (committed — no secrets).

```json
{
  "mcpServers": {
    "landi-flow-local": {
      "transport": "http",
      "url": "http://127.0.0.1:8787/mcp",
      "headers": {
        "Authorization": "Bearer ${env:LANDI_FLOW_MCP_TOKEN}"
      }
    }
  }
}
```

Reload Cursor MCP after setting `LANDI_FLOW_MCP_TOKEN` and starting the worker.

## Staging (deployed)

Add a second entry pointing at the staging MCP worker with a staging-issued `lcf_sk_*` or OAuth `lcf_at_*` token:

```json
{
  "mcpServers": {
    "landi-flow-staging": {
      "transport": "http",
      "url": "https://landi-flow-mcp.mikehenken.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer ${env:LANDI_FLOW_MCP_TOKEN}"
      }
    }
  }
}
```

Issue keys via `POST https://landi-flow-mcp.mikehenken.workers.dev/api/mcp/keys` with a Supabase JWT.

Production custom domain (`mcp.flow.landi.build`) is not configured yet.

## Tool catalogue (22 tools)

| Tool | Kind |
|------|------|
| `flow.search` | read |
| `epic.list`, `epic.get` | read |
| `epic.create`, `epic.update`, `epic.assign` | write |
| `story.list`, `story.get` | read |
| `story.create`, `story.update`, `story.assign`, `story.decompose` | write |
| `comment.create`, `comment.reply`, `comment.create_as_proxy` | write |
| `signal.attach` | write |
| `agent.list`, `members.list` | read |
| `ai.draft_story` | read (requires AI Gateway) |
| `collab.join_story_room`, `collab.broadcast_typing` | read (requires Liveblocks + agent credential) |

Writes route through the Agent Action Bus; scope + read-only gates are enforced at the tool layer.

## Cursor tool naming

The worker registers canonical **dot** names (`story.list`, `epic.create`). Cursor's MCP bridge exposes them as **underscore** names (`story_list`, `epic_create`) in descriptor files. The worker accepts **both** forms — do not rename tools to underscores in `tools/list`; aliases are resolved at `tools/call` dispatch.

## Related docs

- [mcp-oauth-linear-clone-schema.md](./mcp-oauth-linear-clone-schema.md) — auth paths + schema isolation
- `.env.example` — key names only
