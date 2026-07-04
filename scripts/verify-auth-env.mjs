#!/usr/bin/env node
/**
 * Verify Supabase auth env keys are present — prints key NAMES only, never values.
 * Usage: node scripts/verify-auth-env.mjs [--file .env.local]
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const REQUIRED_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const OPTIONAL_SERVER_KEYS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_PROJECT_REF',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_ROOT_DOMAIN',
];

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }
  const lines = readFileSync(filePath, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (value.length > 0) {
      env[key] = 'set';
    }
  }
  return env;
}

const fileArg = process.argv.indexOf('--file');
const envFile = fileArg !== -1 ? process.argv[fileArg + 1] : '.env.local';
const envPath = resolve(process.cwd(), envFile);
const parsed = { ...process.env, ...parseEnvFile(envPath) };

let failed = false;
for (const key of REQUIRED_KEYS) {
  if (!parsed[key]) {
    console.error(`MISSING required key: ${key}`);
    failed = true;
  } else {
    console.log(`OK required key present: ${key}`);
  }
}

for (const key of OPTIONAL_SERVER_KEYS) {
  console.log(parsed[key] ? `OK optional key present: ${key}` : `WARN optional key absent: ${key}`);
}

process.exit(failed ? 1 : 0);
