#!/usr/bin/env node
/**
 * task-09o — Liveblocks auth production probe.
 * Signs in via Supabase REST, POSTs /api/liveblocks-auth with SSR session cookie; redacts token in output.
 * Never prints secret values — only key names and HTTP status.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.join(scriptDir, '..');
const repoDir = path.join(frontendDir, '..');
const studyOut =
  process.argv[2] ??
  path.join(
    repoDir,
    '../landi-labs/studies/Orchestration/linear-clone-product-lifecycle/logs/09-functional-completion/task-09o-liveblocks-production-config/iteration-0/liveblocks-auth-proof.txt',
  );

/** @param {string} envPath */
function loadEnvFile(envPath) {
  /** @type {Record<string, string>} */
  const loaded = {};
  if (!fs.existsSync(envPath)) return loaded;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key) loaded[key] = value;
  }
  return loaded;
}

function envPresenceReport(env) {
  const keys = [
    'NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY',
    'LIVEBLOCKS_SECRET_KEY',
    'LIVEBLOCKS_WEBHOOK_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_PROJECT_REF',
  ];
  return keys
    .map((key) => {
      const raw = env[key]?.trim() ?? '';
      if (!raw) return `${key}=MISSING`;
      if (key.includes('KEY')) {
        const prefix = raw.startsWith('pk_')
          ? 'pk_*'
          : raw.startsWith('sk_')
            ? 'sk_*'
            : raw.startsWith('eyJ')
              ? 'jwt'
              : 'set';
        return `${key}=present (${prefix})`;
      }
      return `${key}=present`;
    })
    .join('\n');
}

function supabaseProjectRef(env) {
  if (env.SUPABASE_PROJECT_REF?.trim()) {
    return env.SUPABASE_PROJECT_REF.trim();
  }
  try {
    const host = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname;
    return host.split('.')[0] ?? 'local';
  } catch {
    return 'local';
  }
}

function buildSupabaseAuthCookie(session, projectRef) {
  const cookieName = `sb-${projectRef}-auth-token`;
  const payload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  });
  const cookieValue = `base64-${Buffer.from(payload, 'utf8').toString('base64url')}`;
  return `${cookieName}=${encodeURIComponent(cookieValue)}`;
}

const fileEnv = loadEnvFile(path.join(repoDir, '.env.local'));
const env = { ...process.env, ...fileEnv };
const siteUrl = (env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const email = (env.E2E_TEST_EMAIL ?? 'test@example.com').trim();
const password = (env.E2E_TEST_PASSWORD ?? 'TestPassword123!').trim();

/** @type {string[]} */
const lines = [];
lines.push(`# task-09o liveblocks-auth probe — ${new Date().toISOString()}`);
lines.push(`site=${siteUrl}`);
lines.push('');
lines.push('## env key presence (values never printed)');
lines.push(envPresenceReport(env));
lines.push('');

const publicKey = env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY?.trim() ?? '';
const secretKey = env.LIVEBLOCKS_SECRET_KEY?.trim() ?? '';
if (!publicKey || publicKey.startsWith('sk_') || !secretKey) {
  lines.push('RESULT=SKIP — Liveblocks keys incomplete (need pk_* + sk_*)');
  fs.mkdirSync(path.dirname(studyOut), { recursive: true });
  fs.writeFileSync(studyOut, lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  process.exit(2);
}

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  lines.push('RESULT=SKIP — Supabase env incomplete for real session');
  fs.mkdirSync(path.dirname(studyOut), { recursive: true });
  fs.writeFileSync(studyOut, lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  process.exit(2);
}

try {
  const { createClient } = await import('@supabase/supabase-js');
  const authClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.session) {
    lines.push(`RESULT=FAIL — Supabase sign-in failed (${signInError?.message ?? 'no session'})`);
    fs.mkdirSync(path.dirname(studyOut), { recursive: true });
    fs.writeFileSync(studyOut, lines.join('\n') + '\n');
    console.log(lines.join('\n'));
    process.exit(1);
  }

  const projectRef = supabaseProjectRef(env);
  const cookieHeader = buildSupabaseAuthCookie(signInData.session, projectRef);
  lines.push(`supabase_project_ref=${projectRef}`);
  lines.push(`session_user_id=${signInData.session.user.id}`);

  const workspacesRes = await fetch(`${siteUrl}/api/v1/workspaces`, {
    headers: { Cookie: cookieHeader },
  });
  const workspacesPayload = await workspacesRes.json();
  const workspaceId = workspacesPayload?.data?.[0]?.id ?? null;

  let storyId = null;
  if (workspaceId) {
    const storiesRes = await fetch(`${siteUrl}/api/v1/workspaces/${workspaceId}/stories`, {
      headers: { Cookie: cookieHeader },
    });
    const storiesPayload = await storiesRes.json();
    storyId = storiesPayload?.data?.[0]?.id ?? null;
  }

  const room =
    workspaceId && storyId
      ? `linear_clone:${workspaceId}:story:${storyId}`
      : workspaceId
        ? `linear_clone:${workspaceId}:board:probe-team`
        : 'linear_clone:probe:story:probe';

  const authRes = await fetch(`${siteUrl}/api/liveblocks-auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ room }),
  });

  let authBody = null;
  try {
    authBody = await authRes.json();
  } catch {
    authBody = null;
  }

  lines.push(`workspace_id=${workspaceId ?? 'none'}`);
  lines.push(`story_id=${storyId ?? 'none'}`);
  lines.push(`room=${room}`);
  lines.push(`POST /api/liveblocks-auth HTTP ${authRes.status}`);

  const token =
    authBody &&
    typeof authBody === 'object' &&
    'token' in authBody &&
    typeof authBody.token === 'string'
      ? authBody.token
      : null;

  if (authRes.status === 200 && token) {
    lines.push(`response.token=[redacted] (${token.length} chars)`);
    lines.push('RESULT=PASS — auth returned 200 with token key');
  } else {
    lines.push(`error=${JSON.stringify(authBody?.error ?? authBody)}`);
    lines.push('RESULT=FAIL — expected HTTP 200 with token');
  }

  fs.mkdirSync(path.dirname(studyOut), { recursive: true });
  fs.writeFileSync(studyOut, lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  process.exit(authRes.status === 200 && token ? 0 : 1);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  lines.push(`RESULT=ERROR — ${message}`);
  lines.push('hint=Ensure Next dev server is running on NEXT_PUBLIC_SITE_URL with MOCK_AUTH=false');
  fs.mkdirSync(path.dirname(studyOut), { recursive: true });
  fs.writeFileSync(studyOut, lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  process.exit(1);
}
