import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (value) env[key] = value;
  }
  return env;
}

const root = path.resolve(import.meta.dirname, '..');
const envFile = loadEnvFile(path.join(root, '.env.local'));
const conn = process.env.PGURL ?? envFile.PGURL;
if (!conn) {
  console.error('PGURL required (env or .env.local) to expose linear_clone to PostgREST');
  process.exit(1);
}

const sqlPath = path.join(root, 'supabase', 'migrations', '0030_expose_linear_clone_postgrest.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');
const client = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log('Applied 0030_expose_linear_clone_postgrest.sql OK');
} catch (error) {
  console.error('Failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await client.end();
}
