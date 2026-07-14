# Hosted migrations (Supabase CLI)

Apply pending SQL migrations to the linked hosted project:

```powershell
pnpm run db:push:remote
```

Requires in `.env.local`:

- `SUPABASE_ACCESS_TOKEN` — personal access token (`sbp_…`) from [Account → Access Tokens](https://supabase.com/dashboard/account/tokens)
- `SUPABASE_PROJECT_REF` — project ref (e.g. from dashboard URL)

Do **not** use `sb_s…` project secrets or legacy `SUPABASE_MANAGEMENT_API_TOKEN` values for the CLI; `supabase link` and `db push` require `sbp_…`.

Alternative when you have direct Postgres: set `PGURL` and use `node scripts/apply-migrations-once.mjs` (applies all files; no migration history table).
