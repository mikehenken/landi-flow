/** Helpers for engineering signal payloads (MCP-IDE-003). */

const PREVIEW_MAX_CHARS = 8_000;

export function readPayloadString(
  payload: Record<string, unknown>,
  key: string,
): string | null {
  const value = payload[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function truncatePreview(text: string, maxChars = PREVIEW_MAX_CHARS): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}\n\n… [truncated — ${text.length - maxChars} more characters]`;
}

/** Inline body fields agents may attach on signal.attach (abbreviated / list context). */
export function extractSignalInlineContent(payload: Record<string, unknown>): string | null {
  const candidates = [
    readPayloadString(payload, 'content_preview'),
    readPayloadString(payload, 'content'),
    readPayloadString(payload, 'body'),
    readPayloadString(payload, 'body_md'),
    readPayloadString(payload, 'inline_body'),
  ];
  for (const value of candidates) {
    if (value) {
      return value;
    }
  }
  return null;
}

export function extractSignalLinks(payload: Record<string, unknown>): {
  url: string | null;
  artifactRef: string | null;
  path: string | null;
} {
  return {
    url: readPayloadString(payload, 'url'),
    artifactRef: readPayloadString(payload, 'artifact_ref'),
    path: readPayloadString(payload, 'path'),
  };
}

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function signalKindIcon(kind: string): string {
  switch (kind) {
    case 'agent_trace':
      return '🤖';
    case 'artifact':
      return '📄';
    case 'deploy':
      return '🚀';
    case 'ci':
      return '✅';
    case 'qa':
      return '🧪';
    case 'agent_lifecycle':
      return '⚡';
    default:
      return '📡';
  }
}

export function buildSignalTitle(payload: Record<string, unknown>): string {
  const explicitTitle = readPayloadString(payload, 'title');
  if (explicitTitle) {
    return explicitTitle;
  }

  const kind = readPayloadString(payload, 'kind') ?? 'engineering';
  const status = readPayloadString(payload, 'status');
  const titleParts = [kind.replace(/_/g, ' ')];
  if (status) {
    titleParts.push(status);
  }
  return titleParts.join(' · ');
}

export function buildSignalSummary(
  payload: Record<string, unknown>,
  inlineContent: string | null,
): string {
  const traceId = readPayloadString(payload, 'trace_id');
  const source = readPayloadString(payload, 'source');
  const url = readPayloadString(payload, 'url');
  const parts: string[] = [];

  if (traceId) {
    parts.push(`Trace ${traceId.slice(0, 8)}…`);
  }
  if (source) {
    parts.push(`Source: ${source}`);
  }
  if (url) {
    parts.push(url);
  }
  if (parts.length === 0 && inlineContent) {
    const oneLine = inlineContent.replace(/\s+/g, ' ').trim();
    parts.push(oneLine.length > 120 ? `${oneLine.slice(0, 120)}…` : oneLine);
  }
  if (parts.length === 0) {
    parts.push('Engineering signal attached');
  }
  return parts.join(' · ');
}
