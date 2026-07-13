#!/usr/bin/env node
/**
 * One-shot Supabase password auth probe — reports status without printing secrets.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.join(scriptDir, '..', '..');
const envPath = path.join(repoDir, '.env.local');

/** @type {Record<string, string>} */
const env = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key) env[key] = value;
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const email = (process.env.E2E_TEST_EMAIL ?? 'test@example.com').trim();
const password = (process.env.E2E_TEST_PASSWORD ?? 'TestPassword123!').trim();

if (!supabaseUrl || !anonKey) {
  console.log(JSON.stringify({ ok: false, reason: 'missing_supabase_env' }));
  process.exit(1);
}

const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: {
    apikey: anonKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password }),
});

const bodyText = await res.text();
/** @type {Record<string, unknown>} */
let body = {};
try {
  body = JSON.parse(bodyText);
} catch {
  body = { raw: bodyText.slice(0, 200) };
}

const result = {
  ok: res.ok,
  status: res.status,
  email,
  error: typeof body.error === 'string' ? body.error : null,
  error_code: typeof body.error_code === 'string' ? body.error_code : null,
  has_access_token: Boolean(body.access_token),
};

console.log(JSON.stringify(result, null, 2));
process.exit(res.ok ? 0 : 1);
