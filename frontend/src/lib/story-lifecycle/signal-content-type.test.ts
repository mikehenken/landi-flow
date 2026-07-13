import { describe, expect, it } from 'vitest';
import {
  buildSignalContentExcerpt,
  detectSignalContentType,
  extractSignalContentContext,
  extractSignalFullContent,
  formatJsonForDisplay,
  formatJsonlLines,
  parseCsvRows,
  type SignalContentContext,
} from '@/lib/story-lifecycle/signal-content-type';

const emptyContext: SignalContentContext = {
  mimeType: null,
  contentType: null,
  artifactRef: null,
  path: null,
  signalKind: null,
};

describe('signal-content-type', () => {
  it('prefers full content over content_preview', () => {
    expect(
      extractSignalFullContent({
        content_preview: 'short',
        content: '# Full markdown body',
      }),
    ).toBe('# Full markdown body');
  });

  it('reads nested payload content objects', () => {
    expect(
      extractSignalFullContent({
        payload: {
          body: 'nested body text',
        },
      }),
    ).toBe('nested body text');
  });

  it('detects markdown from mime type', () => {
    const detected = detectSignalContentType('hello', {
      ...emptyContext,
      mimeType: 'text/markdown',
    });
    expect(detected.type).toBe('markdown');
    expect(detected.label).toBe('Markdown');
  });

  it('detects json from content heuristics', () => {
    const detected = detectSignalContentType('{"ok":true,"items":[1,2]}', emptyContext);
    expect(detected.type).toBe('json');
  });

  it('detects jsonl from multiple json lines', () => {
    const content = '{"a":1}\n{"b":2}\n{"c":3}';
    const detected = detectSignalContentType(content, emptyContext);
    expect(detected.type).toBe('jsonl');
    expect(formatJsonlLines(content)).toHaveLength(3);
  });

  it('detects csv from tabular content', () => {
    const content = 'name,role\nAlice,eng\nBob,pm';
    const detected = detectSignalContentType(content, emptyContext);
    expect(detected.type).toBe('csv');
    expect(parseCsvRows(content)).toEqual([
      ['name', 'role'],
      ['Alice', 'eng'],
      ['Bob', 'pm'],
    ]);
  });

  it('detects markdown from headings and artifact extension', () => {
    const detected = detectSignalContentType('## User query\nWire APIs', {
      ...emptyContext,
      signalKind: 'artifact',
      artifactRef: 'reports/spec.md',
    });
    expect(detected.type).toBe('markdown');
  });

  it('builds short excerpts for inline panels', () => {
    const long = 'word '.repeat(80).trim();
    const excerpt = buildSignalContentExcerpt(long, 40);
    expect(excerpt.length).toBeLessThanOrEqual(41);
    expect(excerpt.endsWith('…')).toBe(true);
  });

  it('pretty-prints valid json for display', () => {
    expect(formatJsonForDisplay('{"z":1,"a":2}')).toBe(
      '{\n  "z": 1,\n  "a": 2\n}',
    );
  });

  it('detects markdown in agent_trace content_preview despite jsonl artifact_ref', () => {
    const payload = {
      kind: 'agent_trace',
      title: 'Attach missing agent traces retroactively',
      status: 'completed',
      trace_id: '555775c9-7136-4836-944a-63ed1c662080',
      artifact_ref:
        'file://C:/Users/mikeh/.cursor/projects/c-Users-mikeh-Projects-landi-landi-canvas-studio/agent-transcripts/555775c9-7136-4836-944a-63ed1c662080.jsonl',
      correlation_id: '6a3121ea-bf9a-49bb-b283-f63829c6f3a5',
      content_preview: `User complaint: Signal preview shows raw JSON instead of markdown.

## Tasks

### 1. Find all relevant code paths
- **signal-content-type.ts** — heuristics
- **signal-payload.ts** — extract content_preview

### 2. Fix detection
Ensure \`content_preview\` markdown renders in the modal.`,
    };

    const content = extractSignalFullContent(payload);
    expect(content).toBe(payload.content_preview);

    const context = extractSignalContentContext(payload, 'agent_trace');
    expect(context.artifactRef).toContain('.jsonl');

    const detected = detectSignalContentType(content!, context);
    expect(detected.type).toBe('markdown');
    expect(detected.label).toBe('Markdown');
  });
});
