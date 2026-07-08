#!/usr/bin/env node
/**
 * Playwright webServer entry for chromium-live-api — kills stale :3000, loads root
 * .env.local, then starts Next dev with live API env (avoids ChunkLoadError reuse).
 */
import { execSync, spawn } from 'node:child_process';
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

const fileEnv = loadRootEnvLocal();
freePort(port);

const devEnv = {
  ...process.env,
  ...fileEnv,
  NEXT_PUBLIC_MOCK_AUTH: 'false',
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? `http://localhost:${port}`,
  NEXT_PUBLIC_ROOT_DOMAIN: fileEnv.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || 'localhost',
};

const child = spawn('pnpm', ['run', 'dev'], {
  cwd: frontendDir,
  env: devEnv,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
