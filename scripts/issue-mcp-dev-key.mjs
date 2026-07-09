#!/usr/bin/env node
/**
 * Dev-only: issue a known MCP API key via service role (bypasses Supabase auth rate limits).
 * Prints prefix only; full key written to stdout last line for piping into env.
 *
 * Usage:
 *   node scripts/issue-mcp-dev-key.mjs [--workspace <uuid>]
 *   $env:LANDI_FLOW_MCP_TOKEN = (node scripts/issue-mcp-dev-key.mjs | Select-Object -Last 1)
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const API_KEY_PREFIX = 'lcf_sk_';
const STORED_PREFIX_LENGTH = 18;

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const env = {};
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && value.length > 0) env[key] = value;
  }
  return env;
}

function hashSecret(value, pepper) {
  if (pepper) {
    return createHmac('sha256', pepper).update(value).digest('hex');
  }
  return createHash('sha256').update(value).digest('hex');
}

function base64Url(bytes) {
  return bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function rest(env, path, options = {}) {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Accept-Profile': 'linear_clone',
      'Content-Profile': 'linear_clone',
      'Content-Type': 'application/json',
      Prefer: options.prefer ?? 'return=representation',
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { ok: res.ok, status: res.status, json };
}

async function main() {
  const env = { ...process.env, ...parseEnvFile(resolve(repoRoot, '.env.local')) };
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = env;
  if (!url || !key) {
    console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  let workspaceId = null;
  const wsArg = process.argv.indexOf('--workspace');
  if (wsArg !== -1 && process.argv[wsArg + 1]) {
    workspaceId = process.argv[wsArg + 1];
  }

  let userId = null;
  if (!workspaceId) {
    const members = await rest(env, 'workspace_members?select=workspace_id,user_id&status=eq.active&limit=1');
    if (!members.ok || !Array.isArray(members.json) || !members.json[0]) {
      console.error('No active workspace_members row found');
      process.exit(1);
    }
    workspaceId = members.json[0].workspace_id;
    userId = members.json[0].user_id;
  } else {
    const members = await rest(
      env,
      `workspace_members?select=user_id&workspace_id=eq.${workspaceId}&status=eq.active&limit=1`
    );
    userId = members.json?.[0]?.user_id ?? null;
  }

  if (!userId) {
    console.error('Could not resolve user_id for workspace');
    process.exit(1);
  }

  const secret = base64Url(randomBytes(32));
  const plaintextKey = `${API_KEY_PREFIX}${secret}`;
  const keyPrefix = plaintextKey.slice(0, STORED_PREFIX_LENGTH);
  const keyHash = hashSecret(plaintextKey, env.MCP_CREDENTIAL_PEPPER || undefined);

  const scopes = [
    'read',
    'write',
    'stories:create',
    'stories:write',
    'epics:create',
    'epics:write',
    'comments:create',
    'signals:write',
    'app:assignable',
    'app:mentionable',
  ];

  let agentId = null;
  const connectAgent = process.argv.includes('--connect-agent');
  if (connectAgent) {
    const agents = await rest(env, `agents?select=id&workspace_id=eq.${workspaceId}&limit=1`);
    agentId = agents.json?.[0]?.id ?? null;
    if (!agentId) {
      const rpcRes = await fetch(`${url}/rest/v1/rpc/ensure_mcp_agent`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Accept-Profile': 'linear_clone',
          'Content-Profile': 'linear_clone',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_workspace_id: workspaceId,
          p_installed_by: userId,
          p_display_name: 'Cursor MCP Test Agent',
        }),
      });
      const agentRow = await rpcRes.json();
      agentId = agentRow?.id ?? null;
    }
  }

  const insert = await rest(env, 'mcp_credentials', {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: workspaceId,
      user_id: userId,
      agent_id: agentId,
      kind: 'api_key',
      name: `dev-cursor-mcp-${new Date().toISOString().slice(0, 10)}`,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      scopes,
      readonly: false,
      resource_uri: env.MCP_RESOURCE_URI || null,
    }),
  });

  if (!insert.ok) {
    console.error(`Insert failed (${insert.status}):`, JSON.stringify(insert.json).slice(0, 400));
    process.exit(1);
  }

  console.log(`Issued dev MCP key for workspace ${workspaceId}`);
  console.log(`Key prefix: ${keyPrefix}…`);
  console.log(plaintextKey);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
