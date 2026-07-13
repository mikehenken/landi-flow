# Cursor MCP — Landi Flow (`landi-flow-mcp`)

Connect Cursor (or any Streamable HTTP MCP client) to the Landi Flow MCP worker for Epic/Story lifecycle tools, agent roster, collaboration presence, and AI draft assistance.

## Worker surfaces

| Route | Purpose |
|-------|---------|
| `GET /` | Health + configured env key **names** (no values) |
| `POST /mcp` | Streamable HTTP JSON-RPC (`initialize`, `tools/list`, `tools/call`) |
| `POST /api/mcp/keys` | Issue personal API key (`lcf_sk_*`) |
| `/.well-known/oauth-protected-resource` | RFC 9728 protected resource metadata |
| `/.well-known/oauth-authorization-server` | RFC 8414 authorization server metadata |
| `POST /register` | RFC 7591 dynamic client registration (DCR) |
| `GET /authorize` | OAuth 2.1 authorization code + PKCE (browser → consent bridge) |
| `POST /token` | Exchange code / refresh / client_credentials |
| `POST /revoke` | RFC 7009 token revocation |

Package: `workers/mcp` (`@landi-flow/mcp-worker`).

## Authentication options

| Method | Best for | How |
|--------|----------|-----|
| **Personal API key** (`lcf_sk_*`) | Local dev, scripts, CI | `POST /api/mcp/keys` with Supabase JWT |
| **OAuth 2.1 + PKCE** (`lcf_at_*`) | Cursor, MCP Inspector, IDE clients | Browser consent flow (below) |
| **Supabase JWT** | Human acting as self (rare for MCP) | `Authorization: Bearer <access_token>` |

## OAuth browser consent flow

Landi Flow mirrors the Cloudflare MCP pattern: MCP clients discover OAuth metadata on the worker, but **human consent** happens in the Next.js app.

```
 MCP client (Cursor)
      │ 1. GET /.well-known/oauth-protected-resource
      ▼
 MCP worker (:8787)
      │ 2. DCR POST /register (public client, PKCE)
      │ 3. Open browser → authorization_endpoint
      ▼
 Next.js consent UI (/en/oauth/mcp/consent)
      │ 4. Supabase login (if needed)
      │ 5. Workspace picker + Approve
      ▼
 Next.js proxy GET /api/oauth/mcp/authorize
      │ 6. Forwards session JWT → worker GET /authorize?workspace_id=…
      ▼
 MCP worker issues code → redirect to client redirect_uri
      │ 7. POST /token (code + code_verifier)
      ▼
 MCP client uses lcf_at_* on POST /mcp
```

### Required env (names only)

| Key | Where | Purpose |
|-----|-------|---------|
| `MCP_OAUTH_ISSUER` | MCP worker | Issuer URL in discovery metadata (e.g. `http://127.0.0.1:8787`) |
| `MCP_RESOURCE_URI` | MCP worker | RFC 8707 audience (e.g. `http://127.0.0.1:8787/mcp`) |
| `MCP_OAUTH_CONSENT_BASE_URL` | MCP worker | Web app origin for consent redirect (e.g. `http://localhost:3000`) |
| `MCP_WORKER_URL` | Next.js | Authorize proxy target (e.g. `http://127.0.0.1:8787`) |
| `NEXT_PUBLIC_SITE_URL` | Next.js | Site origin for Supabase OAuth callbacks |

When `MCP_OAUTH_CONSENT_BASE_URL` is set, `/.well-known/oauth-authorization-server` advertises  
`{MCP_OAUTH_CONSENT_BASE_URL}/en/oauth/mcp/consent` as `authorization_endpoint`.

## Local dev

### 1. Sync secrets into Wrangler (gitignored)

```bash
node scripts/sync-mcp-dev-vars.mjs
```

Copies Supabase + MCP keys from repo-root `.env.local` → `workers/mcp/.dev.vars`.

Add to `.env.local` (local values):

```env
MCP_OAUTH_ISSUER=http://127.0.0.1:8787
MCP_RESOURCE_URI=http://127.0.0.1:8787/mcp
MCP_OAUTH_CONSENT_BASE_URL=http://localhost:3000
MCP_WORKER_URL=http://127.0.0.1:8787
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Re-run `node scripts/sync-mcp-dev-vars.mjs` after adding MCP keys.

### 2. Start frontend + MCP worker

```bash
pnpm dev                              # Next.js on :3000
pnpm --filter @landi-flow/mcp-worker dev   # MCP on :8787
```

### 3a. OAuth (recommended for Cursor)

**Cursor `.cursor/mcp.json`** — no static token; Cursor performs OAuth discovery:

```json
{
  "mcpServers": {
    "landi-flow-local": {
      "transport": "http",
      "url": "http://127.0.0.1:8787/mcp"
    }
  }
}
```

Reload MCP in Cursor → approve in browser at `http://localhost:3000/en/oauth/mcp/consent`.

**MCP Inspector** (manual PKCE):

1. Open MCP Inspector → connect to `http://127.0.0.1:8787/mcp`
2. Inspector runs DCR + PKCE automatically
3. Complete browser consent when prompted
4. Inspector stores refresh token for subsequent calls

### 3b. Personal API key (scripts / fallback)

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

For API-key mode in Cursor, add the header:

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

## Staging (deployed)

```json
{
  "mcpServers": {
    "landi-flow-staging": {
      "transport": "http",
      "url": "https://landi-flow-mcp.mikehenken.workers.dev/mcp"
    }
  }
}
```

Set worker secrets:

- `MCP_OAUTH_ISSUER=https://landi-flow-mcp.mikehenken.workers.dev`
- `MCP_RESOURCE_URI=https://landi-flow-mcp.mikehenken.workers.dev/mcp`
- `MCP_OAUTH_CONSENT_BASE_URL=https://<your-flow-frontend-host>`

Set Next.js / Cloudflare Worker env:

- `MCP_WORKER_URL=https://landi-flow-mcp.mikehenken.workers.dev`

Production custom domain (`mcp.flow.landi.build`) is not configured yet.

## Supabase dashboard checklist (manual)

Complete these in [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication**:

1. **URL configuration**
   - Site URL: your Flow frontend origin (e.g. `http://localhost:3000` or `https://flow.landi.build`)
   - Redirect URLs: add `{origin}/auth/callback` for each environment

2. **OAuth providers** (for Google/GitHub login on consent page)
   - Enable **Google** and/or **GitHub**
   - Set client ID/secret from each provider console
   - Provider redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`

3. **Email** (optional for password login on consent page)
   - Configure SMTP or use Supabase default for dev

4. **JWT** — no change needed; MCP worker verifies the same Supabase access JWT forwarded by `/api/oauth/mcp/authorize`

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
