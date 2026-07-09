#!/usr/bin/env node
/**
 * Unified Next.js dev launcher for landi-flow.
 *
 * Always pins NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_ROOT_DOMAIN to match the
 * port we actually bind — overrides root .env.local so OAuth redirects,
 * metadataBase, and cookie logic work without hand-editing secrets when
 * switching between :3000, :3100, etc.
 *
 * next.config.ts loads root .env.local via @next/env, which never overrides
 * an already-set process.env value, so these exports win for the child.
 *
 * Usage:
 *   node scripts/dev.mjs              # auto-pick 3000 → 3100 → 3200
 *   node scripts/dev.mjs --port 3100
 *   PORT=3200 node scripts/dev.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.join(scriptDir, '..');

const DEV_PORT_CANDIDATES = [3000, 3100, 3200];
const ROOT_DOMAIN = 'localhost';

/** @param {string[]} argv */
function parsePortFromArgs(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--port' || arg === '-p') {
      const next = argv[i + 1];
      const parsed = Number.parseInt(next ?? '', 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    const match = /^--port=(\d+)$/.exec(arg);
    if (match) {
      const parsed = Number.parseInt(match[1], 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return undefined;
}

/** @param {number} port */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

/** @param {number[]} candidates */
async function pickPort(candidates) {
  for (const candidate of candidates) {
    if (await isPortAvailable(candidate)) {
      return candidate;
    }
  }
  return candidates[candidates.length - 1];
}

/**
 * Resolve pnpm's Next.js CLI shim. Direct `node .../next/dist/bin/next` breaks
 * under pnpm because @next/env is not on NODE_PATH without the shim.
 * @param {string} appDir
 */
function resolveNextCli(appDir) {
  const unixBin = path.join(appDir, 'node_modules', '.bin', 'next');
  const winBin = path.join(appDir, 'node_modules', '.bin', 'next.CMD');
  if (process.platform === 'win32' && fs.existsSync(winBin)) {
    return winBin;
  }
  if (fs.existsSync(unixBin)) {
    return unixBin;
  }
  throw new Error(
    `[dev] Next.js CLI not found under ${appDir}/node_modules/.bin. Run pnpm install from repo root.`,
  );
}

/**
 * Spawn `next dev` via the pnpm .bin shim so peer deps resolve in CI/subprocesses.
 * @param {string} appDir
 * @param {number} port
 * @param {NodeJS.ProcessEnv} childEnv
 */
function spawnNextDev(appDir, port, childEnv) {
  const nextCli = resolveNextCli(appDir);
  const args = ['dev', '--port', String(port)];

  if (process.platform === 'win32') {
    return spawn('cmd.exe', ['/d', '/s', '/c', nextCli, ...args], {
      cwd: appDir,
      env: childEnv,
      stdio: 'inherit',
      shell: false,
    });
  }

  return spawn('sh', [nextCli, ...args], {
    cwd: appDir,
    env: childEnv,
    stdio: 'inherit',
    shell: false,
  });
}

async function main() {
  const fromEnv = Number.parseInt(process.env.PORT ?? '', 10);
  const fromArg = parsePortFromArgs(process.argv.slice(2));

  let port;
  if (Number.isFinite(fromArg) && fromArg > 0) {
    port = fromArg;
  } else if (Number.isFinite(fromEnv) && fromEnv > 0) {
    port = fromEnv;
  } else {
    port = await pickPort(DEV_PORT_CANDIDATES);
  }

  const siteUrl = `http://localhost:${port}`;

  const childEnv = {
    ...process.env,
    PORT: String(port),
    NEXT_PUBLIC_SITE_URL: siteUrl,
    NEXT_PUBLIC_ROOT_DOMAIN: ROOT_DOMAIN,
  };

  console.log('');
  console.log('  landi-flow dev');
  console.log(`  → ${siteUrl}`);
  console.log(`  NEXT_PUBLIC_SITE_URL=${siteUrl}`);
  console.log(`  NEXT_PUBLIC_ROOT_DOMAIN=${ROOT_DOMAIN}`);
  if (port !== DEV_PORT_CANDIDATES[0] && !fromArg && !Number.isFinite(fromEnv)) {
    console.log(`  (port ${DEV_PORT_CANDIDATES[0]} was busy — using ${port})`);
  }
  console.log('');

  const child = spawnNextDev(frontendDir, port, childEnv);

  child.on('error', (error) => {
    console.error('[dev] Failed to spawn Next.js:', error.message);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    process.exit(code ?? (signal ? 1 : 0));
  });
}

main().catch((error) => {
  console.error('[dev] Failed to start:', error instanceof Error ? error.message : error);
  process.exit(1);
});
