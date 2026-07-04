#!/usr/bin/env node
/**
 * AR-03 CI RLS gate — asserts every linear_clone heap table has RLS enabled.
 * Run after migrations in CI or locally against a migrated database.
 *
 * Requires DATABASE_URL (postgres connection string).
 * Does not mutate production secrets; read-only catalog query.
 */

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('AR-03 RLS gate: DATABASE_URL is required');
  process.exit(1);
}

async function main(): Promise<void> {
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: databaseUrl });

  try {
    await client.connect();

    const { rows } = await client.query<{ relname: string }>(`
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'linear_clone'
        AND c.relkind = 'r'
        AND NOT c.relrowsecurity
      ORDER BY c.relname
    `);

    if (rows.length > 0) {
      const names = rows.map((r) => r.relname).join(', ');
      console.error(`AR-03 RLS gate FAILED: tables without RLS: ${names}`);
      process.exit(1);
    }

    console.log('AR-03 RLS gate PASSED: all linear_clone tables have RLS enabled');
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`AR-03 RLS gate error: ${message}`);
  process.exit(1);
});
