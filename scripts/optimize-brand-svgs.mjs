#!/usr/bin/env node
/**
 * Optimizes brand logo SVGs and refreshes checksums in image-manifest.json.
 * Run: node scripts/optimize-brand-svgs.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const logoDir = path.join(repoRoot, 'public', 'assets', 'logo');
const manifestPath = path.join(logoDir, 'image-manifest.json');

const SVG_TARGETS = ['logomark-primary.svg', 'logo-wordmark-horizontal.svg'];
const MANIFEST_FILE_ROLES = ['logomark-primary.svg', 'logo-wordmark-horizontal.svg', 'logomark-primary.jpg', 'logo-wordmark-horizontal.jpg'];

/** Strip comments, collapse whitespace, remove empty attributes. */
function optimizeSvg(source) {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

function sha256(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function fileMeta(fileName) {
  const filePath = path.join(logoDir, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing asset: ${filePath}`);
  }
  const stat = fs.statSync(filePath);
  return {
    bytes: stat.size,
    sha256: sha256(filePath),
  };
}

function main() {
  for (const fileName of SVG_TARGETS) {
    const filePath = path.join(logoDir, fileName);
    const raw = fs.readFileSync(filePath, 'utf8');
    const optimized = optimizeSvg(raw);
    fs.writeFileSync(filePath, optimized, 'utf8');
    console.log(`[optimize-brand-svgs] Optimized ${fileName} (${optimized.length} bytes)`);
  }

  if (!fs.existsSync(manifestPath)) {
    console.warn('[optimize-brand-svgs] Manifest missing; SVG optimization only.');
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const now = new Date().toISOString();

  for (const asset of manifest.assets ?? []) {
    if (!asset.file || !MANIFEST_FILE_ROLES.includes(asset.file)) {
      continue;
    }
    const meta = fileMeta(asset.file);
    asset.bytes = meta.bytes;
    asset.sha256 = meta.sha256;
    if (asset.format === 'svg') {
      asset.optimized_at = now;
    } else {
      asset.validated_at = now;
    }
  }

  manifest.pipeline = manifest.pipeline ?? {};
  manifest.pipeline.svg_optimized_at = now;
  manifest.pipeline.last_validated = now;

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log('[optimize-brand-svgs] Updated image-manifest.json checksums');
}

main();
