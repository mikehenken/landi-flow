#!/usr/bin/env node
/**
 * Configurable Next.js dev launcher. Defaults to port 3100 so it can run
 * alongside anything already bound to the canonical :3000 dev server.
 *
 * The `dev` script (next dev --port 3000) is intentionally left untouched;
 * this launcher is additive. Override the port with the PORT env var.
 *
 * NEXT_PUBLIC_SITE_URL is pinned to the chosen origin so Supabase OAuth /
 * auth-callback redirects and metadataBase resolve to the port we actually
 * serve on, instead of the hard-coded http://localhost:3000 in .env.local.
 * next.config.ts loads root .env.local via @next/env, which never overrides an
 * already-set process.env value, so this override wins for the spawned child.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.join(scriptDir, '..');

const port = Number.parseInt(process.env.PORT ?? '3100', 10);
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `http://localhost:${port}`;

const childEnv = {
  ...process.env,
  NEXT_PUBLIC_SITE_URL: siteUrl,
  NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || 'localhost',
};

const child = spawn('pnpm', ['exec', 'next', 'dev', '--port', String(port)], {
  cwd: frontendDir,
  env: childEnv,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
