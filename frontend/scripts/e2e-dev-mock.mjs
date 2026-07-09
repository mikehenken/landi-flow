#!/usr/bin/env node
/**
 * Playwright webServer entry for chromium-mock — kills stale :3000, forces MOCK_AUTH=true
 * even when landi-flow/.env.local sets NEXT_PUBLIC_MOCK_AUTH empty.
 */
import { execSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.join(scriptDir, '..');
const repoDir = path.join(frontendDir, '..');
const port = Number.parseInt(process.env.PORT ?? '3000', 10);

function loadRootEnvLocal() {
  const envPath = path.join(repoDir, '.env.local');
  /** @type {Record<string, string>} */
  const loaded = {};
  if (!fs.existsSync(envPath)) return loaded;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key === 'NEXT_PUBLIC_MOCK_AUTH') continue;
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key) loaded[key] = value;
  }
  return loaded;
}

function freePort(targetPort) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr ":${targetPort}"`, { encoding: 'utf8' });
      for (const line of output.split(/\r?\n/)) {
        if (!line.includes('LISTENING')) continue;
        const pid = Number.parseInt(line.trim().split(/\s+/).pop() ?? '', 10);
        if (Number.isFinite(pid) && pid > 0) {
          execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore' });
        }
      }
      return;
    }
    execSync(`lsof -ti:${targetPort} | xargs -r kill -9`, { stdio: 'ignore', shell: '/bin/bash' });
  } catch {
    // already free
  }
}

function runPredevSync() {
  const syncScript = path.join(scriptDir, 'sync-public-assets.mjs');
  if (!fs.existsSync(syncScript)) {
    console.warn('[e2e-dev-mock] sync-public-assets.mjs missing; skipping predev sync.');
    return;
  }
  const result = spawnSync(process.execPath, [syncScript], {
    cwd: frontendDir,
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) {
    throw new Error(`[e2e-dev-mock] sync-public-assets failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `[e2e-dev-mock] sync-public-assets exited with code ${result.status ?? 'unknown'}`,
    );
  }
}

const fileEnv = loadRootEnvLocal();

async function main() {
  runPredevSync();
  freePort(port);

  // Allow Windows TIME_WAIT / process teardown before rebinding :3000.
  const postKillDelayMs = process.platform === 'win32' ? 4_000 : 0;
  if (postKillDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, postKillDelayMs));
  }

  const devEnv = {
    ...process.env,
    ...fileEnv,
    PORT: String(port),
    LANDI_FORCE_MOCK_AUTH: 'true',
    NEXT_PUBLIC_MOCK_AUTH: 'true',
    NEXT_PUBLIC_OBS_ENABLE_CLIENT_REPORTING: 'true',
    NEXT_PUBLIC_MOCK_ASKS_WEBHOOK_SECRET: 'e2e-asks-secret',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? `http://localhost:${port}`,
    NEXT_PUBLIC_ROOT_DOMAIN: fileEnv.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || 'localhost',
  };

  const devScript = path.join(scriptDir, 'dev.mjs');
  if (!fs.existsSync(devScript)) {
    throw new Error(`[e2e-dev-mock] Missing dev launcher at ${devScript}`);
  }

  const child = spawn(process.execPath, [devScript, '--port', String(port)], {
    cwd: frontendDir,
    env: devEnv,
    stdio: 'inherit',
    shell: false,
  });

  child.on('error', (error) => {
    console.error('[e2e-dev-mock] Failed to spawn dev.mjs:', error.message);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`[e2e-dev-mock] dev server exited with code ${code}`);
    }
    if (signal) {
      console.error(`[e2e-dev-mock] dev server terminated by signal ${signal}`);
    }
    process.exit(code ?? (signal ? 1 : 0));
  });
}

main().catch((error) => {
  console.error('[e2e-dev-mock] Failed to start:', error instanceof Error ? error.message : error);
  process.exit(1);
});
