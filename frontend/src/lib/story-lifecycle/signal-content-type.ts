/** Content-type detection for engineering signal bodies (MCP-IDE-003). */

import {
  extractSignalLinks,
  readPayloadString,
} from '@/lib/story-lifecycle/signal-payload';

export type SignalContentType = 'markdown' | 'json' | 'jsonl' | 'csv' | 'text';

export interface SignalContentContext {
  mimeType: string | null;
  contentType: string | null;
  artifactRef: string | null;
  path: string | null;
  signalKind: string | null;
}

export interface DetectedSignalContent {
  type: SignalContentType;
  /** Human label for UI badges. */
  label: string;
}

const MARKDOWN_HINT =
  /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|```|>\s|\*\*|__|\[.+\]\(.+\))/;

export function extractSignalContentContext(
  payload: Record<string, unknown>,
  signalKind?: string | null,
): SignalContentContext {
  const links = extractSignalLinks(payload);
  return {
    mimeType: readPayloadString(payload, 'mime_type'),
    contentType: readPayloadString(payload, 'content_type'),
    artifactRef: links.artifactRef,
    path: links.path,
    signalKind: signalKind ?? readPayloadString(payload, 'kind'),
  };
}

export function coerceSignalContentValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? value : null;
  }
  if (value !== null && typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return null;
    }
  }
  return null;
}

/** Full body text — prefers `content` over abbreviated `content_preview`. */
export function extractSignalFullContent(payload: Record<string, unknown>): string | null {
  const directCandidates: unknown[] = [
    payload.content,
    payload.body,
    payload.body_md,
    payload.inline_body,
    payload.content_preview,
  ];

  for (const candidate of directCandidates) {
    const coerced = coerceSignalContentValue(candidate);
    if (coerced) {
      return coerced;
    }
  }

  const nestedContent = readNestedContentObject(payload, 'content');
  if (nestedContent) {
    return nestedContent;
  }

  const nestedPayload = readNestedContentObject(payload, 'payload');
  if (nestedPayload) {
    return nestedPayload;
  }

  return null;
}

function readNestedContentObject(
  payload: Record<string, unknown>,
  key: string,
): string | null {
  const nested = payload[key];
  if (!nested || typeof nested !== 'object' || Array.isArray(nested)) {
    return null;
  }
  const record = nested as Record<string, unknown>;
  for (const subKey of ['content', 'body', 'body_md', 'text', 'markdown', 'value']) {
    const coerced = coerceSignalContentValue(record[subKey]);
    if (coerced) {
      return coerced;
    }
  }
  return coerceSignalContentValue(nested);
}

function extensionFromRef(ref: string | null): string | null {
  if (!ref) {
    return null;
  }
  const match = /\.([a-z0-9]+)(?:\?|#|$)/i.exec(ref);
  return match?.[1]?.toLowerCase() ?? null;
}

function typeFromMimeOrContentType(value: string | null): SignalContentType | null {
  if (!value) {
    return null;
  }
  const normalized = value.toLowerCase().trim();
  if (normalized.includes('markdown') || normalized === 'text/md' || normalized === 'md') {
    return 'markdown';
  }
  if (
    normalized.includes('jsonl') ||
    normalized.includes('ndjson') ||
    normalized.includes('x-ndjson')
  ) {
    return 'jsonl';
  }
  if (
    normalized === 'application/json' ||
    normalized === 'text/json' ||
    normalized.endsWith('+json') ||
    normalized === 'json'
  ) {
    return 'json';
  }
  if (normalized.includes('csv') || normalized === 'text/csv') {
    return 'csv';
  }
  if (normalized.startsWith('text/') || normalized === 'plain' || normalized === 'text') {
    return 'text';
  }
  return null;
}

function typeFromExtension(ext: string | null): SignalContentType | null {
  switch (ext) {
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'json':
      return 'json';
    case 'jsonl':
    case 'ndjson':
      return 'jsonl';
    case 'csv':
      return 'csv';
    case 'txt':
      return 'text';
    default:
      return null;
  }
}

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function looksLikeJsonl(text: string): boolean {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) {
    return false;
  }
  let parsedCount = 0;
  for (const line of lines) {
    const parsed = tryParseJson(line);
    if (parsed !== null && typeof parsed === 'object') {
      parsedCount += 1;
    }
  }
  return parsedCount >= 2 && parsedCount / lines.length >= 0.8;
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trim();
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
    return false;
  }
  return tryParseJson(trimmed) !== null;
}

function looksLikeCsv(text: string): boolean {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) {
    return false;
  }
  const commaLines = lines.filter((line) => line.includes(','));
  if (commaLines.length < 2) {
    return false;
  }
  const columnCounts = commaLines.map((line) => line.split(',').length);
  const first = columnCounts[0];
  if (!first || first < 2) {
    return false;
  }
  const matching = columnCounts.filter((count) => count === first).length;
  return matching / columnCounts.length >= 0.75;
}

function looksLikeMarkdown(text: string, context: SignalContentContext): boolean {
  if (context.signalKind === 'artifact') {
    const ext = extensionFromRef(context.artifactRef) ?? extensionFromRef(context.path);
    if (ext === 'md' || ext === 'markdown') {
      return true;
    }
  }
  return MARKDOWN_HINT.test(text);
}

function contentTypeLabel(type: SignalContentType): string {
  switch (type) {
    case 'markdown':
      return 'Markdown';
    case 'json':
      return 'JSON';
    case 'jsonl':
      return 'JSONL';
    case 'csv':
      return 'CSV';
    case 'text':
      return 'Plain text';
    default:
      return 'Text';
  }
}

function extensionTypeForContext(
  context: SignalContentContext,
): SignalContentType | null {
  // artifact_ref/path extensions describe linked artifacts (e.g. trace .jsonl files),
  // not necessarily the inline preview body on agent_trace and other signal kinds.
  if (context.signalKind !== 'artifact') {
    return null;
  }
  const ext =
    extensionFromRef(context.artifactRef) ?? extensionFromRef(context.path);
  return typeFromExtension(ext);
}

/** Infer how to render signal body content. */
export function detectSignalContentType(
  content: string,
  context: SignalContentContext,
): DetectedSignalContent {
  const explicit =
    typeFromMimeOrContentType(context.mimeType) ??
    typeFromMimeOrContentType(context.contentType) ??
    extensionTypeForContext(context);

  if (explicit) {
    return { type: explicit, label: contentTypeLabel(explicit) };
  }

  if (looksLikeJsonl(content)) {
    return { type: 'jsonl', label: contentTypeLabel('jsonl') };
  }
  if (looksLikeJson(content)) {
    return { type: 'json', label: contentTypeLabel('json') };
  }
  if (looksLikeCsv(content)) {
    return { type: 'csv', label: contentTypeLabel('csv') };
  }
  if (looksLikeMarkdown(content, context)) {
    return { type: 'markdown', label: contentTypeLabel('markdown') };
  }

  return { type: 'text', label: contentTypeLabel('text') };
}

export const SIGNAL_EXCERPT_MAX_CHARS = 240;

/** Short single-line excerpt for inline signal panels. */
export function buildSignalContentExcerpt(
  text: string,
  maxChars = SIGNAL_EXCERPT_MAX_CHARS,
): string {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  const oneLine = normalized.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= maxChars) {
    return oneLine;
  }
  return `${oneLine.slice(0, maxChars)}…`;
}

/** Parse CSV rows (handles simple quoted fields). */
export function parseCsvRows(text: string): string[][] {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map(parseCsvLine);
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

/** Format JSON string for display (pretty-print when valid). */
export function formatJsonForDisplay(text: string): string {
  const parsed = tryParseJson(text.trim());
  if (parsed === null) {
    return text;
  }
  return JSON.stringify(parsed, null, 2);
}

/** Split JSONL into formatted line entries. */
export function formatJsonlLines(text: string): Array<{ lineNumber: number; formatted: string }> {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const entries: Array<{ lineNumber: number; formatted: string }> = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    const parsed = tryParseJson(trimmed);
    entries.push({
      lineNumber: index + 1,
      formatted: parsed !== null ? JSON.stringify(parsed, null, 2) : trimmed,
    });
  });

  return entries;
}
