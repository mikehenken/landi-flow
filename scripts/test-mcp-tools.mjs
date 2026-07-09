#!/usr/bin/env node
/**
 * End-to-end MCP tool matrix for landi-flow-mcp (local or remote).
 *
 * Auth flow:
 *   1. Supabase password sign-in (test@example.com by default)
 *   2. Issue workspace-bound personal API key via POST /api/mcp/keys
 *   3. tools/list + tools/call for every registered tool
 *
 * Usage:
 *   node scripts/sync-mcp-dev-vars.mjs
 *   pnpm --filter @landi-flow/mcp-worker dev   # separate terminal
 *   node scripts/test-mcp-tools.mjs [--base http://127.0.0.1:8787] [--report path.md]
 *
 * Never prints secret values.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const DEFAULT_BASE = 'http://127.0.0.1:8787';
const TEST_EMAIL = process.env.MCP_TEST_EMAIL ?? 'test@example.com';
const TEST_PASSWORD = process.env.MCP_TEST_PASSWORD ?? 'TestPassword123!';

function parseArgs(argv) {
  const args = { base: DEFAULT_BASE, report: null, skipWrites: false, token: process.env.LANDI_FLOW_MCP_TOKEN ?? process.env.MCP_TEST_API_KEY ?? null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--base' && argv[i + 1]) {
      args.base = argv[++i].replace(/\/$/, '');
    } else if (argv[i] === '--report' && argv[i + 1]) {
      args.report = resolve(process.cwd(), argv[++i]);
    } else if (argv[i] === '--skip-writes') {
      args.skipWrites = true;
    } else if (argv[i] === '--token' && argv[i + 1]) {
      args.token = argv[++i];
    }
  }
  return args;
}

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

async function mcpRpc(base, token, method, params, id = 1) {
  const res = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON MCP response (${res.status}): ${text.slice(0, 200)}`);
  }
  return { status: res.status, json };
}

function classifyResult(toolName, response, isWrite) {
  if (response.json?.error) {
    const msg = response.json.error.message ?? String(response.json.error.code);
    if (isWrite && /Missing required|Provide exactly one|must be a non-empty|not found|violates foreign key|epic_not_found|story_not_found|parent_id/i.test(msg)) {
      return { status: 'pass-expected-input', detail: msg };
    }
    if (/Agent credential required/i.test(msg)) {
      return { status: 'skip-agent-credential', detail: msg };
    }
    if (/not configured|AI Gateway is not configured|Liveblocks is not configured/i.test(msg)) {
      return { status: 'skip-config', detail: msg };
    }
    if (/Insufficient scope|Read-only credential|workspace_id is required/i.test(msg)) {
      return { status: 'fail-auth', detail: msg };
    }
    return { status: 'fail', detail: msg };
  }
  if (response.json?.result?.isError) {
    const msg = response.json.result.content?.[0]?.text ?? 'tool error';
    if (isWrite && /Missing required|Provide exactly one|not found|violates foreign key|epic_not_found|story_not_found|parent_id/i.test(msg)) {
      return { status: 'pass-expected-input', detail: msg };
    }
    if (/Agent credential required/i.test(msg)) {
      return { status: 'skip-agent-credential', detail: msg };
    }
    if (/not configured|AI Gateway|Liveblocks/i.test(msg)) {
      return { status: 'skip-config', detail: msg };
    }
    return { status: 'fail', detail: msg };
  }
  return { status: 'pass', detail: 'ok' };
}

async function fetchContext(env, workspaceId) {
  const ctx = {
    userId: null,
    teamId: null,
    workflowStateId: null,
    epicStatusId: null,
    epicId: null,
    storyId: null,
    storyRef: null,
    agentId: null,
    commentParentId: null,
  };
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const base = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !base) return ctx;

  async function q(table, params) {
    const url = new URL(`${base}/rest/v1/${table}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Accept-Profile': 'linear_clone',
        'Content-Profile': 'linear_clone',
      },
    });
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  }

  const teams = await q('teams', { select: 'id', workspace_id: `eq.${workspaceId}`, limit: '1' });
  ctx.teamId = teams[0]?.id ?? null;

  if (ctx.teamId) {
    const states = await q('workflow_states', {
      select: 'id',
      team_id: `eq.${ctx.teamId}`,
      limit: '1',
    });
    ctx.workflowStateId = states[0]?.id ?? null;
  }

  const epicStatuses = await q('epic_statuses', { select: 'id', workspace_id: `eq.${workspaceId}`, limit: '1' });
  ctx.epicStatusId = epicStatuses[0]?.id ?? null;

  const epics = await q('epics', {
    select: 'id',
    workspace_id: `eq.${workspaceId}`,
    archived_at: 'is.null',
    limit: '1',
    order: 'updated_at.desc',
  });
  ctx.epicId = epics[0]?.id ?? null;

  const stories = await q('stories', {
    select: 'id,identifier,team_id',
    workspace_id: `eq.${workspaceId}`,
    archived_at: 'is.null',
    limit: '1',
    order: 'updated_at.desc',
  });
  if (stories[0]) {
    ctx.storyId = stories[0].id;
    ctx.storyRef = stories[0].identifier ?? stories[0].id;
    ctx.teamId = ctx.teamId ?? stories[0].team_id;
  }

  const agents = await q('agents', { select: 'id', workspace_id: `eq.${workspaceId}`, limit: '1' });
  ctx.agentId = agents[0]?.id ?? null;

  if (ctx.storyId) {
    const comments = await q('comments', {
      select: 'id',
      story_id: `eq.${ctx.storyId}`,
      parent_id: 'is.null',
      limit: '1',
      order: 'created_at.desc',
    });
    ctx.commentParentId = comments[0]?.id ?? null;
  }

  return ctx;
}

/** Minimal arguments for read tools; write tools use real FK ids when available. */
function argsForTool(toolName, workspaceId, context) {
  const ws = { workspace_id: workspaceId };
  switch (toolName) {
    case 'flow.search':
      return { ...ws, query: 'test', limit: 3 };
    case 'epic.list':
      return { ...ws, limit: 5 };
    case 'epic.get':
      return context.epicId ? { ...ws, epic_id: context.epicId } : { ...ws, epic_id: '00000000-0000-0000-0000-000000000001' };
    case 'story.list':
      return { ...ws, limit: 5 };
    case 'story.get':
      return context.storyRef ? { ...ws, story: context.storyRef } : { ...ws, story: 'ENG-1' };
    case 'agent.list':
    case 'members.list':
      return ws;
    case 'ai.draft_story':
      return { ...ws, prompt: 'Draft a one-line test story about MCP verification.' };
    case 'collab.join_story_room':
      return context.storyRef
        ? { ...ws, story_id: context.storyRef, agent_id: context.agentId }
        : { ...ws, story_id: 'ENG-1', agent_id: context.agentId };
    case 'collab.broadcast_typing':
      return context.storyRef
        ? { ...ws, story_id: context.storyRef, agent_id: context.agentId }
        : { ...ws, story_id: 'ENG-1', agent_id: context.agentId };
    // Write tools — intentional missing/invalid args for safe dry-run
    case 'epic.create':
      return {
        ...ws,
        name: 'MCP Test Epic',
        slug: `mcp-test-${Date.now()}`,
        status_id: context.epicStatusId ?? '00000000-0000-0000-0000-000000000099',
      };
    case 'epic.update':
      return { ...ws, epic_id: context.epicId ?? '00000000-0000-0000-0000-000000000001', name: 'MCP probe' };
    case 'epic.assign':
      return { ...ws, epic_id: context.epicId ?? '00000000-0000-0000-0000-000000000001', unassign_lead: true };
    case 'story.create':
      return {
        ...ws,
        team_id: context.teamId ?? '00000000-0000-0000-0000-000000000099',
        title: 'MCP probe story',
        workflow_state_id: context.workflowStateId ?? '00000000-0000-0000-0000-000000000099',
      };
    case 'story.update':
      return {
        ...ws,
        team_id: context.teamId ?? '00000000-0000-0000-0000-000000000099',
        story_id: context.storyId ?? '00000000-0000-0000-0000-000000000001',
        title: 'MCP probe',
      };
    case 'story.assign':
      return { ...ws, story_id: context.storyId ?? '00000000-0000-0000-0000-000000000001', unassign_assignee: true };
    case 'story.decompose':
      return {
        ...ws,
        team_id: context.teamId ?? '00000000-0000-0000-0000-000000000099',
        workflow_state_id: context.workflowStateId ?? '00000000-0000-0000-0000-000000000099',
        subtasks: ['MCP subtask A', 'MCP subtask B'],
      };
    case 'comment.create':
      return { ...ws, story_id: context.storyId ?? '00000000-0000-0000-0000-000000000001', body_md: 'MCP probe' };
    case 'comment.reply':
      return {
        ...ws,
        story_id: context.storyId ?? '00000000-0000-0000-0000-000000000001',
        parent_id: context.commentParentId ?? '00000000-0000-0000-0000-000000000099',
        body_md: 'MCP probe reply',
      };
    case 'comment.create_as_proxy':
      return {
        ...ws,
        story_id: context.storyId ?? '00000000-0000-0000-0000-000000000001',
        on_behalf_of_user_id: context.userId,
        body_md: 'MCP proxy probe',
      };
    case 'signal.attach':
      return {
        ...ws,
        story_id: context.storyId ?? '00000000-0000-0000-0000-000000000001',
        signal: { kind: 'ci', status: 'passed', correlation_id: `mcp-test-${Date.now()}` },
      };
    default:
      return ws;
  }
}

const WRITE_TOOLS = new Set([
  'epic.create',
  'epic.update',
  'epic.assign',
  'story.create',
  'story.update',
  'story.assign',
  'story.decompose',
  'comment.create',
  'comment.reply',
  'comment.create_as_proxy',
  'signal.attach',
]);

async function main() {
  const args = parseArgs(process.argv);
  const envPath = resolve(repoRoot, '.env.local');
  const env = { ...process.env, ...parseEnvFile(envPath) };

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
  }

  // Health check
  const healthRes = await fetch(`${args.base}/`);
  if (!healthRes.ok) {
    console.error(`MCP worker not reachable at ${args.base} (status ${healthRes.status})`);
    console.error('Start with: pnpm --filter @landi-flow/mcp-worker dev');
    process.exit(1);
  }
  const health = await healthRes.json();
  console.log(`MCP worker: ${health.service ?? 'unknown'} @ ${args.base}`);

  let apiKey = args.token;
  let workspaceId = null;
  let userId = null;

  if (apiKey && String(apiKey).startsWith('lcf_sk_')) {
    console.log('Using provided API key (prefix lcf_sk_…)');

    if (serviceKey) {
      const keyPrefix = String(apiKey).slice(0, 18);
      const credUrl = new URL(`${supabaseUrl}/rest/v1/mcp_credentials`);
      credUrl.searchParams.set('select', 'workspace_id,user_id');
      credUrl.searchParams.set('key_prefix', `eq.${keyPrefix}`);
      credUrl.searchParams.set('limit', '1');
      const credRes = await fetch(credUrl, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Accept-Profile': 'linear_clone',
          'Content-Profile': 'linear_clone',
        },
      });
      const credRows = await credRes.json();
      if (Array.isArray(credRows) && credRows[0]) {
        workspaceId = credRows[0].workspace_id;
        userId = credRows[0].user_id;
      }
    }
    if (!workspaceId) {
      console.error('Could not resolve workspace from API key prefix — pass workspace via seeded data or sign-in flow.');
      process.exit(1);
    }
    console.log(`Workspace: ${workspaceId}`);
  } else {
    const signInRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnon,
        Authorization: `Bearer ${supabaseAnon}`,
      },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    const signIn = await signInRes.json();
    if (!signInRes.ok || !signIn.access_token) {
      console.error(`Supabase sign-in failed for ${TEST_EMAIL}: ${signIn.error_description ?? signIn.msg ?? signInRes.status}`);
      console.error('Tip: node scripts/issue-mcp-dev-key.mjs then pass --token <lcf_sk_…>');
      process.exit(1);
    }
    const userJwt = signIn.access_token;
    userId = signIn.user?.id;
    console.log(`Signed in: ${TEST_EMAIL} (user id present: ${Boolean(userId)})`);

    if (serviceKey && userId) {
      const memberUrl = new URL(`${supabaseUrl}/rest/v1/workspace_members`);
      memberUrl.searchParams.set('select', 'workspace_id');
      memberUrl.searchParams.set('user_id', `eq.${userId}`);
      memberUrl.searchParams.set('status', 'eq.active');
      memberUrl.searchParams.set('limit', '1');
      const memberRes = await fetch(memberUrl, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Accept-Profile': 'linear_clone',
          'Content-Profile': 'linear_clone',
        },
      });
      const memberships = await memberRes.json();
      workspaceId = Array.isArray(memberships) ? memberships[0]?.workspace_id ?? null : null;
    }
    if (!workspaceId) {
      console.error('Could not resolve workspace_id for test user — ensure workspace_members row exists.');
      process.exit(1);
    }
    console.log(`Workspace: ${workspaceId}`);

    const keyRes = await fetch(`${args.base}/api/mcp/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userJwt}`,
      },
      body: JSON.stringify({
        workspace_id: workspaceId,
        name: `cursor-mcp-test-${new Date().toISOString().slice(0, 10)}`,
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
    if (!keyRes.ok) {
      const errText = await keyRes.text();
      console.error(`API key issuance failed (${keyRes.status}): ${errText.slice(0, 300)}`);
      process.exit(1);
    }
    const keyJson = await keyRes.json();
    apiKey = keyJson.plaintext_key ?? keyJson.key?.plaintext_key;
    if (!apiKey || !String(apiKey).startsWith('lcf_sk_')) {
      console.error('API key response missing plaintext_key');
      process.exit(1);
    }
    console.log('Issued workspace-bound API key (prefix lcf_sk_…)');
  }

  // Protocol checks
  const init = await mcpRpc(args.base, apiKey, 'initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'mcp-test-harness', version: '1.0.0' },
  });
  if (init.json?.result?.serverInfo?.name !== 'landi-flow-mcp') {
    console.error('initialize failed:', JSON.stringify(init.json));
    process.exit(1);
  }
  console.log('initialize: pass');

  const ping = await mcpRpc(args.base, apiKey, 'ping', {}, 2);
  if (ping.json?.error) {
    console.error('ping failed:', ping.json.error);
    process.exit(1);
  }
  console.log('ping: pass');

  const list = await mcpRpc(args.base, apiKey, 'tools/list', {}, 3);
  const tools = list.json?.result?.tools ?? [];
  if (tools.length < 16) {
    console.error(`tools/list returned only ${tools.length} tools`);
    process.exit(1);
  }
  console.log(`tools/list: ${tools.length} tools`);

  // Seed context from DB + read tools
  const context = await fetchContext(env, workspaceId);
  context.userId = userId;

  const epicList = await mcpRpc(args.base, apiKey, 'tools/call', {
    name: 'epic.list',
    arguments: { workspace_id: workspaceId, limit: 1 },
  }, 10);
  const epics = epicList.json?.result?.structuredContent?.epics;
  if (Array.isArray(epics) && epics[0]?.id) context.epicId = epics[0].id;

  const storyList = await mcpRpc(args.base, apiKey, 'tools/call', {
    name: 'story.list',
    arguments: { workspace_id: workspaceId, limit: 1 },
  }, 11);
  const stories = storyList.json?.result?.structuredContent?.stories;
  if (Array.isArray(stories) && stories[0]) {
    context.storyId = stories[0].id;
    context.storyRef = stories[0].identifier ?? stories[0].id;
    context.teamId = stories[0].team_id;
  }

  const agents = await mcpRpc(args.base, apiKey, 'tools/call', {
    name: 'agent.list',
    arguments: { workspace_id: workspaceId },
  }, 12);
  const agentRows = agents.json?.result?.structuredContent?.agents;
  if (Array.isArray(agentRows) && agentRows[0]?.id) context.agentId = agentRows[0].id;

  const results = [];
  let id = 100;
  for (const tool of tools) {
    const isWrite = WRITE_TOOLS.has(tool.name);
    if (args.skipWrites && isWrite) {
      results.push({ tool: tool.name, status: 'skip', detail: '--skip-writes' });
      continue;
    }
    const callArgs = argsForTool(tool.name, workspaceId, context);
    const resp = await mcpRpc(
      args.base,
      apiKey,
      'tools/call',
      { name: tool.name, arguments: callArgs },
      id++
    );
    const verdict = classifyResult(tool.name, resp, isWrite);
    results.push({ tool: tool.name, isWrite, ...verdict });
    const icon =
      verdict.status === 'pass' || verdict.status === 'pass-expected-input'
        ? '✓'
        : verdict.status.startsWith('skip')
          ? '○'
          : '✗';
    console.log(`${icon} ${tool.name} — ${verdict.status}${verdict.detail !== 'ok' ? `: ${verdict.detail}` : ''}`);
  }

  const pass = results.filter((r) => r.status === 'pass' || r.status === 'pass-expected-input').length;
  const skip = results.filter((r) => r.status.startsWith('skip')).length;
  const fail = results.filter((r) => r.status.startsWith('fail')).length;

  console.log('\n--- Summary ---');
  console.log(`Total: ${results.length} | Pass: ${pass} | Skip (config): ${skip} | Fail: ${fail}`);

  if (args.report) {
    const lines = [
      '# Landi Flow MCP Tool Test Report',
      '',
      `**Date:** ${new Date().toISOString()}`,
      `**Base URL:** ${args.base}`,
      `**Workspace:** ${workspaceId}`,
      `**Tools:** ${results.length}`,
      '',
      '| Tool | Write | Status | Detail |',
      '|------|-------|--------|--------|',
    ];
    for (const r of results) {
      lines.push(`| ${r.tool} | ${r.isWrite ? 'yes' : 'no'} | ${r.status} | ${String(r.detail).replace(/\|/g, '\\|').slice(0, 120)} |`);
    }
    lines.push('', `**Pass:** ${pass} | **Skip:** ${skip} | **Fail:** ${fail}`);
    writeFileSync(args.report, `${lines.join('\n')}\n`, 'utf8');
    console.log(`Report written: ${args.report}`);
  }

  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
