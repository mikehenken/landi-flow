# MCP OAuth + `linear_clone` schema isolation (task-09u)

Landi Flow stores **all application data** in the Postgres schema `linear_clone`. Supabase Auth (`auth.users`) is shared with the app for human login; entity rows never live in `public` application tables.

## Environment keys (names only)

| Key | Consumer | Purpose |
|-----|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Next.js, Workers | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Next.js, Workers | Browser/anon JWT verification |
| `SUPABASE_SERVICE_ROLE_KEY` | Workers (API + MCP) | Service-role DB access (server-only) |
| `MCP_OAUTH_ISSUER` | MCP Worker | OAuth authorization server issuer URL |
| `MCP_RESOURCE_URI` | MCP Worker | RFC 8707 resource identifier for tokens |
| `MCP_CREDENTIAL_PEPPER` | MCP Worker | HMAC pepper for API keys / opaque tokens |
| `MCP_WORKER_URL` | Next.js (optional) | Agent Action Bus target |
| `MCP_WORKER_TOKEN` | Next.js (optional) | Server-to-server MCP management |

Never commit values. Production secrets belong in Cloudflare Workers secrets / GCP Secret Manager — not in repo files.

## Auth paths

### 1. Human app (Next.js)

1. Browser → Supabase Auth (OAuth or email/password).
2. Session cookies refreshed in middleware (`frontend/src/lib/supabase/middleware.ts`).
3. All PostgREST queries use `db: { schema: LINEAR_CLONE_SCHEMA }` via `@landi-flow/auth/schema`.
4. `/api/v1/*` proxy forwards the user JWT to the API Worker.

### 2. MCP Worker (`workers/mcp`)

Inbound credentials (`workers/mcp/src/auth/authenticate.ts`):

1. **`lcf_sk_*`** — personal API key (scoped, revocable).
2. **`lcf_at_*`** — OAuth access token (DB-backed, instant revoke).
3. **Supabase user JWT** — human acting as themselves.

DB client: `createServiceDbClient()` → `LINEAR_CLONE_SCHEMA` only (`workers/mcp/src/lib/db.ts`).

OAuth surfaces: `/.well-known/oauth-*`, `/authorize`, `/token`, `/revoke`, `/register`, `/mcp`.

### 3. API Worker (`workers/api`)

Service-role client with `LINEAR_CLONE_SCHEMA` (`workers/api/src/lib/db.ts`). Authorization enforced in controllers + RLS on hosted Supabase.

## Verification

```bash
pnpm run verify:schema-isolation
pnpm run verify:rls-gate   # requires DATABASE_URL — read-only catalog query
```

Static gate asserts every known DB client file imports `LINEAR_CLONE_SCHEMA` and sets `db.schema` accordingly.

## Isolation rules

- **Do** use `LINEAR_CLONE_SCHEMA` from `@landi-flow/auth/schema` for all Supabase JS clients.
- **Do** route MCP mutations through the Agent Action Bus / `execute_mutation_with_outbox`.
- **Do not** query landing-editor or other product schemas from this repo.
- **Do not** use `public` schema for clone entities (`stories`, `epics`, `agents`, …).
