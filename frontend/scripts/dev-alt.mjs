#!/usr/bin/env node
/**
 * Alias launcher — explicit alternate port (3100) for running alongside
 * landing-editor / landi-canvas on :3000. Delegates to dev.mjs.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const devLauncher = path.join(scriptDir, 'dev.mjs');

const child = spawn(process.execPath, [devLauncher, '--port', '3100'], {
  cwd: path.join(scriptDir, '..'),
  env: process.env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
