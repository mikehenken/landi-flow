#!/usr/bin/env node
/**
 * Copy MCP worker env keys from repo-root .env.local → workers/mcp/.dev.vars
 * (gitignored). Prints key NAMES only — never values.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const sourcePath = resolve(repoRoot, '.env.local');
const targetPath = resolve(repoRoot, 'workers/mcp/.dev.vars');

const MCP_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MCP_OAUTH_ISSUER',
  'MCP_RESOURCE_URI',
  'MCP_CREDENTIAL_PEPPER',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_AI_GATEWAY_ENDPOINT',
  'CLOUDFLARE_AI_GATEWAY_TOKEN',
  'CLOUDFLARE_AI_GATEWAY_ID',
  'GEMINI_API_KEY',
  'VERTEX_API_KEY',
  'DEFAULT_GEMINI_MODEL',
  'ENABLE_OUTBOX_EMITTER',
  'LIVEBLOCKS_SECRET_KEY',
];

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }
  const env = {};
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && value.length > 0) {
      env[key] = value;
    }
  }
  return env;
}

if (!existsSync(sourcePath)) {
  console.error('Missing .env.local — copy from .env.example and populate Supabase keys.');
  process.exit(1);
}

const source = parseEnvFile(sourcePath);
const lines = [];
const copied = [];

for (const key of MCP_KEYS) {
  const value = source[key];
  if (typeof value === 'string' && value.length > 0) {
    lines.push(`${key}=${value}`);
    copied.push(key);
  }
}

if (copied.length === 0) {
  console.error('No MCP keys found in .env.local');
  process.exit(1);
}

writeFileSync(targetPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote ${targetPath}`);
for (const key of copied) {
  console.log(`  ✓ ${key}`);
}
