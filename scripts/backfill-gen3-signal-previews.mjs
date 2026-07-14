#!/usr/bin/env node
/**
 * Backfill content_preview on GEN-3 agent_trace signals from local jsonl copies.
 * Loads `.env.local` for SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
 *
 * Usage:
 *   node scripts/backfill-gen3-signal-previews.mjs
 *   node scripts/backfill-gen3-signal-previews.mjs --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(import.meta.dirname, '..');
const dryRun = process.argv.includes('--dry-run');

const GEN3_STORY_ID = '170da728-1a48-4a80-b912-cec9420c6ca4';
const TRACES_DIR = path.resolve(
  root,
  '../landi-labs/studies/Orchestration/linear-clone-product-lifecycle/outputs/2026-07-13-session-artifact/agent-traces',
);
const SESSION_ARTIFACT_MD = path.resolve(
  root,
  '../landi-labs/studies/Orchestration/linear-clone-product-lifecycle/outputs/2026-07-13-session-artifact.md',
);

const PREVIEW_MAX = 8000;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (value) env[key] = value;
  }
  return env;
}

function truncate(text, max = PREVIEW_MAX) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n… [truncated — ${text.length - max} more characters]`;
}

function extractUserQueryPreview(jsonlText) {
  const firstLine = jsonlText.split(/\r?\n/).find((line) => line.trim().length > 0);
  if (!firstLine) return truncate(jsonlText);

  try {
    const row = JSON.parse(firstLine);
    const parts = row?.message?.content;
    const textPart = Array.isArray(parts)
      ? parts.find((part) => part?.type === 'text')?.text
      : typeof parts === 'string'
        ? parts
        : '';
    if (typeof textPart === 'string') {
      const match = textPart.match(/<user_query>\s*([\s\S]*?)(?:<\/user_query>|$)/);
      if (match?.[1]) {
        return truncate(match[1].trim());
      }
    }
  } catch {
    // fall through
  }

  return truncate(jsonlText);
}

function buildTracePreviewMap() {
  const map = new Map();

  if (!fs.existsSync(TRACES_DIR)) {
    console.warn(`Traces dir missing: ${TRACES_DIR}`);
    return map;
  }

  for (const file of fs.readdirSync(TRACES_DIR)) {
    if (!file.endsWith('.jsonl')) continue;
    const traceId = file.replace(/-parent\.jsonl$/, '').replace(/\.jsonl$/, '');
    const content = fs.readFileSync(path.join(TRACES_DIR, file), 'utf8');
    map.set(traceId, extractUserQueryPreview(content));
  }

  if (fs.existsSync(SESSION_ARTIFACT_MD)) {
    map.set('session-artifact-md', truncate(fs.readFileSync(SESSION_ARTIFACT_MD, 'utf8')));
  }

  return map;
}

async function main() {
  const envFile = loadEnvFile(path.join(root, '.env.local'));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? envFile.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? envFile.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const previews = buildTracePreviewMap();
  console.log(`Loaded ${previews.size} local trace previews`);

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: events, error } = await supabase
    .schema('linear_clone')
    .from('activity_events')
    .select('id, payload')
    .eq('story_id', GEN3_STORY_ID)
    .eq('event_type', 'signal.attached');

  if (error) {
    console.error('Failed to list activity events:', error.message);
    process.exit(1);
  }

  let updated = 0;
  for (const event of events ?? []) {
    const payload = event.payload ?? {};
    const kind = typeof payload.kind === 'string' ? payload.kind : '';
    if (!kind) continue;

    let preview = null;
    if (kind === 'agent_trace') {
      const traceId = typeof payload.trace_id === 'string' ? payload.trace_id : null;
      preview = traceId ? previews.get(traceId) ?? null : null;
    } else if (kind === 'artifact') {
      const artifactPath = typeof payload.path === 'string' ? payload.path : '';
      if (artifactPath.includes('2026-07-13-session-artifact')) {
        preview = previews.get('session-artifact-md') ?? null;
      }
    }

    if (!preview) continue;
    if (typeof payload.content_preview === 'string' && payload.content_preview.length > 0) {
      continue;
    }

    const nextPayload = { ...payload, content_preview: preview };
    console.log(`Update ${event.id} (${kind}) — preview ${preview.length} chars`);

    if (!dryRun) {
      const { error: updateError } = await supabase
        .schema('linear_clone')
        .from('activity_events')
        .update({ payload: nextPayload })
        .eq('id', event.id);

      if (updateError) {
        console.error(`Failed to update ${event.id}:`, updateError.message);
        process.exit(1);
      }
    }

    updated += 1;
  }

  console.log(`${dryRun ? '[dry-run] would update' : 'Updated'} ${updated} signal(s) on GEN-3`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
