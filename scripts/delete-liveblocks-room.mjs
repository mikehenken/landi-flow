#!/usr/bin/env node
/**
 * Delete a Liveblocks room by id (uses LIVEBLOCKS_SECRET_KEY from .env.local).
 * Usage: node scripts/delete-liveblocks-room.mjs <roomId>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.join(scriptDir, '..');

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

const roomId = process.argv[2];
if (!roomId) {
  console.error('Usage: node scripts/delete-liveblocks-room.mjs <roomId>');
  process.exit(1);
}

const env = { ...process.env, ...loadEnvFile(path.join(repoDir, '.env.local')) };
const secretKey = env.LIVEBLOCKS_SECRET_KEY?.trim() ?? '';

if (!secretKey) {
  console.error('LIVEBLOCKS_SECRET_KEY missing in .env.local');
  process.exit(1);
}

const { Liveblocks } = await import('@liveblocks/node');
const liveblocks = new Liveblocks({ secret: secretKey });

try {
  await liveblocks.deleteRoom(roomId);
  console.log(`Deleted Liveblocks room: ${roomId}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to delete room ${roomId}: ${message}`);
  process.exit(1);
}
