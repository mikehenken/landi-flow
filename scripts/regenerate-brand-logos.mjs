#!/usr/bin/env node
/**
 * Regenerates Landi Flow logo JPG assets via Gemini 3.1 image preview.
 * Workflow requests gemini-3.1-pro-image-preview; API resolves to gemini-3.1-flash-image-preview.
 *
 * Usage:
 *   GEMINI_API_KEY=... node scripts/regenerate-brand-logos.mjs
 *   node scripts/regenerate-brand-logos.mjs --dry-run
 *
 * After regeneration:
 *   node scripts/optimize-brand-svgs.mjs
 *   pnpm --filter @landi-flow/frontend prebuild
 *   pnpm run lint
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const logoDir = path.join(repoRoot, 'public', 'assets', 'logo');
const manifestPath = path.join(logoDir, 'image-manifest.json');

/** Workflow task-09v spec; not published on Gemini API as of 2026-07-07. */
const REQUESTED_MODEL = 'gemini-3.1-pro-image-preview';
/** Published 3.1 image preview (Nano Banana 2) — workflow intent when pro alias absent. */
const RESOLVED_MODEL = 'gemini-3.1-flash-image-preview';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const PROMPTS = {
  'logomark-primary.jpg': {
    id: 'logomark-primary',
    dimensions: '512x512',
    prompt:
      'Minimal squircle app logomark for "Landi Flow" project management software. ' +
      'Indigo to violet gradient (#5e6ad2 to #7c3aed), abstract flowing curve motif, ' +
      'dark-mode friendly, no text, flat geometric style, centered on transparent or dark background.',
  },
  'logo-wordmark-horizontal.jpg': {
    id: 'logo-wordmark-horizontal',
    dimensions: '1200x400',
    prompt:
      'Horizontal wordmark lockup reading "Landi Flow" for a modern PM app. ' +
      'Small squircle mark on the left, indigo/violet palette (#5e6ad2 accent), ' +
      'clean sans-serif typography, legible at 24px height, dark background.',
  },
};

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function generateImage(apiKey, prompt, model) {
  const url = `${API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini API ${response.status}: ${detail.slice(0, 500)}`);
  }

  const payload = await response.json();
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data;
    if (inline?.data) {
      const mime = inline.mimeType ?? inline.mime_type ?? 'image/jpeg';
      return { buffer: Buffer.from(inline.data, 'base64'), mime };
    }
  }

  throw new Error('Gemini response did not include inline image data');
}

function updateManifest(generated, model) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const now = new Date().toISOString();

  for (const asset of manifest.assets ?? []) {
    const match = generated.find((g) => g.id === asset.id || g.id === asset.id.replace(/-jpg$/, ''));
    if (!match || asset.format !== 'jpg') {
      continue;
    }
    asset.source = 'gemini_regen';
    asset.source_model = model;
    asset.requested_model = REQUESTED_MODEL;
    asset.generated_at = now;
    asset.bytes = match.bytes;
    asset.sha256 = match.sha256;
    asset.regen_status = 'completed';
    delete asset.target_model;
  }

  manifest.version = now.slice(0, 10);
  manifest.pipeline = manifest.pipeline ?? {};
  manifest.pipeline.gemini_regen = {
    requested_model: REQUESTED_MODEL,
    model,
    status: 'completed',
    completed_at: now,
    model_resolution:
      model === REQUESTED_MODEL
        ? 'direct'
        : `${REQUESTED_MODEL} unavailable; resolved to ${model}`,
  };
  manifest.approach =
    'Gemini 3.1 JPG regeneration completed; SVG canonical assets retained for UI scaling.';

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  fs.mkdirSync(logoDir, { recursive: true });

  if (!apiKey) {
    console.log('[regenerate-brand-logos] GEMINI_API_KEY is not set.');
    console.log('[regenerate-brand-logos] Dry-run mode — production SVG assets remain canonical.');
    console.log('');
    console.log('When ready:');
    console.log('  $env:GEMINI_API_KEY="your-key"  # PowerShell');
    console.log('  node scripts/regenerate-brand-logos.mjs');
    console.log('  node scripts/optimize-brand-svgs.mjs');
    console.log('  pnpm --filter @landi-flow/frontend prebuild');
    process.exit(dryRun ? 0 : 1);
  }

  const generated = [];

  console.log(
    `[regenerate-brand-logos] Model: ${RESOLVED_MODEL} (workflow requests ${REQUESTED_MODEL})`,
  );

  for (const [fileName, spec] of Object.entries(PROMPTS)) {
    console.log(`[regenerate-brand-logos] Generating ${fileName} via ${RESOLVED_MODEL}...`);
    const { buffer } = await generateImage(apiKey, spec.prompt, RESOLVED_MODEL);
    const outPath = path.join(logoDir, fileName);
    fs.writeFileSync(outPath, buffer);
    const meta = { id: spec.id, bytes: buffer.length, sha256: sha256Buffer(buffer) };
    generated.push(meta);
    console.log(`[regenerate-brand-logos] Wrote ${fileName} (${meta.bytes} bytes)`);
  }

  if (fs.existsSync(manifestPath)) {
    updateManifest(generated, RESOLVED_MODEL);
    console.log('[regenerate-brand-logos] Updated image-manifest.json');
  }

  console.log('[regenerate-brand-logos] Done. Run optimize-brand-svgs.mjs and frontend prebuild.');
}

main().catch((error) => {
  console.error('[regenerate-brand-logos] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
