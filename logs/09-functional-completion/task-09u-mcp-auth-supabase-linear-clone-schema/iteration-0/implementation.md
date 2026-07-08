# task-09u-mcp-auth-supabase-linear-clone-schema — iteration 0

## Scope

MCP OAuth + auth users shared with app; ALL data in `linear_clone` schema only.

## Implementation

- `scripts/verify-schema-isolation.mjs` — static gate: 7 DB client files must use `LINEAR_CLONE_SCHEMA`
- `docs/setup/mcp-oauth-linear-clone-schema.md` — auth path + env key names (no values)
- `packages/auth/src/schema-isolation.test.ts` — unit test for schema constant
- `package.json` — `verify:schema-isolation` script

## Acceptance mapping

| Criterion | Evidence |
|-----------|----------|
| Schema isolation verified | `pnpm run verify:schema-isolation` → PASSED (7 clients) |
| MCP worker auth documented | `docs/setup/mcp-oauth-linear-clone-schema.md` |
| Env key names only | Doc table + `.env.example` names (no secret values printed) |

## Validation

```bash
pnpm run verify:schema-isolation
pnpm run lint
```
