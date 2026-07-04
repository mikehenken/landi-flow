import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.join(__dirname, '..');
const source = path.join(frontendRoot, '..', 'public');
const target = path.join(frontendRoot, 'public');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[sync-public-assets] Source missing: ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(source)) {
  console.warn('[sync-public-assets] Monorepo public/ not found; skipping.');
  process.exit(0);
}

copyRecursive(source, target);
console.log('[sync-public-assets] Synced public assets to frontend/public');
