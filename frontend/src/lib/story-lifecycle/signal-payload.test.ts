import { describe, expect, it } from 'vitest';
import {
  buildSignalSummary,
  buildSignalTitle,
  extractSignalInlineContent,
  signalKindIcon,
  truncatePreview,
} from '@/lib/story-lifecycle/signal-payload';

describe('signal-payload', () => {
  it('prefers explicit title from payload', () => {
    expect(
      buildSignalTitle({
        kind: 'agent_trace',
        title: 'Fix agent MCP tools (production)',
        status: 'completed',
      }),
    ).toBe('Fix agent MCP tools (production)');
  });

  it('extracts inline content preview fields in priority order', () => {
    expect(
      extractSignalInlineContent({
        summary: 'fallback',
        content_preview: 'preview wins',
      }),
    ).toBe('preview wins');
  });

  it('builds agent_trace summary with trace id', () => {
    expect(
      buildSignalSummary(
        { kind: 'agent_trace', trace_id: 'b6c33c66-a802-4c53-abb2-082585f39831' },
        null,
      ),
    ).toContain('Trace b6c33c66');
  });

  it('truncates long previews', () => {
    const long = 'x'.repeat(10_000);
    const result = truncatePreview(long, 100);
    expect(result.length).toBeLessThan(200);
    expect(result).toContain('truncated');
  });

  it('maps signal kinds to icons', () => {
    expect(signalKindIcon('agent_trace')).toBe('🤖');
    expect(signalKindIcon('deploy')).toBe('🚀');
    expect(signalKindIcon('ci')).toBe('✅');
  });
});
