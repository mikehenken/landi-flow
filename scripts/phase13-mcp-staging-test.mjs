#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const reportPath =
  'C:/Users/mikeh/Projects/landi/landi-labs/studies/Orchestration/linear-clone-product-lifecycle/logs/13-post-deploy-qa/task-13a-e2e/iteration-0/mcp-tool-test-report.md';

function parseEnvFile(filePath) {
  const env = {};
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key) env[key] = value;
  }
  return env;
}

const env = { ...process.env, ...parseEnvFile(resolve(repoRoot, '.env.local')) };
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const testEmail = env.MCP_TEST_EMAIL ?? 'test@example.com';
const testPassword = env.MCP_TEST_PASSWORD ?? 'TestPassword123!';
const mcpBase = 'https://landi-flow-mcp.mikehenken.workers.dev';

const signInRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: supabaseAnon,
    Authorization: `Bearer ${supabaseAnon}`,
  },
  body: JSON.stringify({ email: testEmail, password: testPassword }),
});
const signIn = await signInRes.json();
if (!signInRes.ok || !signIn.access_token) {
  console.error('Supabase sign-in failed:', signIn.error_description ?? signInRes.status);
  process.exit(1);
}

const memberRes = await fetch(
  `${supabaseUrl}/rest/v1/workspace_members?select=workspace_id&user_id=eq.${signIn.user.id}&status=eq.active&limit=1`,
  {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Accept-Profile': 'linear_clone',
    },
  },
);
const memberships = await memberRes.json();
const workspaceId = Array.isArray(memberships) ? memberships[0]?.workspace_id : null;
if (!workspaceId) {
  console.error('No workspace membership for test user');
  process.exit(1);
}

const keyRes = await fetch(`${mcpBase}/api/mcp/keys`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${signIn.access_token}`,
  },
  body: JSON.stringify({
    workspace_id: workspaceId,
    name: `phase13-qa-${new Date().toISOString().slice(0, 10)}`,
    scopes: [
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
    ],
  }),
});
const keyJson = await keyRes.json();
const apiKey = keyJson.api_key ?? keyJson.plaintext_key ?? keyJson.key?.plaintext_key;
if (!keyRes.ok || !apiKey) {
  console.error('Key issuance failed:', keyRes.status, JSON.stringify(keyJson).slice(0, 400));
  process.exit(1);
}
console.log('Issued staging MCP key via JWT (prefix lcf_sk_…)');

const result = spawnSync(
  'node',
  [
    resolve(repoRoot, 'scripts/test-mcp-tools.mjs'),
    '--base',
    mcpBase,
    '--token',
    apiKey,
    '--report',
    reportPath,
  ],
  {
    stdio: 'inherit',
    env: { ...process.env, LANDI_FLOW_MCP_TOKEN: '', MCP_TEST_API_KEY: '' },
  },
);
process.exit(result.status ?? 1);
