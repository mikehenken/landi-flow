#!/usr/bin/env node
/**
 * Link to hosted Supabase and apply pending migrations via CLI (`supabase db push`).
 * Loads `.env.local` from repo root. Never logs secret values.
 *
 * Required in .env.local:
 *   SUPABASE_ACCESS_TOKEN=sbp_...  (Dashboard → Account → Access Tokens)
 *   SUPABASE_PROJECT_REF=...       (optional if already linked)
 *
 * Optional fallback: SUPABASE_MANAGEMENT_API_TOKEN only if it is an sbp_ token
 * (legacy sb_s... secrets are NOT valid for the CLI).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');

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

function pickAccessToken(envFile) {
  const candidates = [
    process.env.SUPABASE_ACCESS_TOKEN,
    envFile.SUPABASE_ACCESS_TOKEN,
    process.env.SUPABASE_MANAGEMENT_API_TOKEN,
    envFile.SUPABASE_MANAGEMENT_API_TOKEN,
  ].filter(Boolean);

  for (const token of candidates) {
    if (token.startsWith('sbp_')) return token;
  }
  return null;
}

function runSupabase(args, env) {
  const result = spawnSync('supabase', args, {
    cwd: root,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const envFile = loadEnvFile(path.join(root, '.env.local'));
const accessToken = pickAccessToken(envFile);

if (!accessToken) {
  console.error(
    'Missing Supabase CLI access token. Add to .env.local:\n' +
      '  SUPABASE_ACCESS_TOKEN=sbp_...\n' +
      '(Create at https://supabase.com/dashboard/account/tokens)\n' +
      'Note: sb_s... service-role-style secrets and SUPABASE_MANAGEMENT_API_TOKEN with sb_s prefix do NOT work for `supabase link` / `db push`.',
  );
  process.exit(1);
}

const projectRef =
  process.env.SUPABASE_PROJECT_REF ??
  envFile.SUPABASE_PROJECT_REF ??
  process.argv[2];

if (!projectRef) {
  console.error('Missing SUPABASE_PROJECT_REF in .env.local or as first CLI argument.');
  process.exit(1);
}

const childEnv = {
  ...process.env,
  SUPABASE_ACCESS_TOKEN: accessToken,
};

console.log(`Linking project ref ${projectRef} (token: sbp_…)`);
runSupabase(['link', '--project-ref', projectRef], childEnv);

console.log('Pushing migrations (supabase db push)…');
runSupabase(['db', 'push'], childEnv);

console.log('Done.');
