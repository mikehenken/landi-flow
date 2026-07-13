'use client';

import * as React from 'react';
import { Button, cn, InstantMarkdownEditor } from '@landi-flow/ui';
import { ExternalLink, Copy, Check } from 'lucide-react';
import type { EngineeringSignalView } from '@/lib/story-lifecycle/story-signals';
import {
  extractSignalInlineContent,
  extractSignalLinks,
  isHttpUrl,
  readPayloadString,
  truncatePreview,
} from '@/lib/story-lifecycle/signal-payload';

export interface SignalContentViewerProps {
  signal: EngineeringSignalView;
  className?: string;
}

function CopyableMono({ value, label }: { value: string; label: string }): React.ReactElement {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-2 rounded border border-border/60 bg-black/20 p-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase text-foreground-subtle">{label}</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[10px]"
          onClick={() => void handleCopy()}
        >
          {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <p className="break-all font-mono text-[11px] text-muted-foreground">{value}</p>
    </div>
  );
}

function ExternalLinkRow({ href, label }: { href: string; label: string }): React.ReactElement {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      data-testid="signal-external-link"
    >
      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      {label}
    </a>
  );
}

function MarkdownPreview({ content }: { content: string }): React.ReactElement {
  return (
    <div
      className="mt-2 max-h-64 overflow-auto rounded border border-border/60 bg-black/20 p-2"
      data-testid="signal-markdown-preview"
    >
      <InstantMarkdownEditor value={content} readOnly variant="compact" aria-label="Signal content" />
    </div>
  );
}

function JsonPayloadPanel({ payload }: { payload: Record<string, unknown> }): React.ReactElement {
  const [showRaw, setShowRaw] = React.useState(false);

  return (
    <div className="mt-3">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={() => setShowRaw((value) => !value)}
        data-testid="signal-toggle-raw-json"
      >
        {showRaw ? 'Hide raw JSON' : 'Show raw JSON'}
      </Button>
      {showRaw ? (
        <pre
          className="mt-2 max-h-48 overflow-auto rounded bg-black/30 p-2 text-xs"
          data-testid="signal-raw-json"
        >
          {JSON.stringify(payload, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

/** Kind-aware expandable content for engineering signals (MCP-IDE-003). */
export function SignalContentViewer({
  signal,
  className,
}: SignalContentViewerProps): React.ReactElement {
  const payload = signal.payload;
  const inlineContent = extractSignalInlineContent(payload);
  const links = extractSignalLinks(payload);
  const traceId = readPayloadString(payload, 'trace_id');
  const commitSha = readPayloadString(payload, 'commit_sha') ?? readPayloadString(payload, 'sha');

  const httpLink =
    links.url && isHttpUrl(links.url)
      ? links.url
      : links.artifactRef && isHttpUrl(links.artifactRef)
        ? links.artifactRef
        : null;

  const fileRef =
    links.artifactRef && !isHttpUrl(links.artifactRef)
      ? links.artifactRef
      : links.path && !isHttpUrl(links.path)
        ? links.path
        : null;

  const previewText = inlineContent ? truncatePreview(inlineContent) : null;
  const looksLikeMarkdown =
    previewText !== null &&
    (signal.kind === 'artifact' ||
      /\.md$/i.test(fileRef ?? '') ||
      readPayloadString(payload, 'mime_type') === 'text/markdown' ||
      previewText.includes('# ') ||
      previewText.includes('## '));

  return (
    <div className={cn('space-y-1', className)} data-testid="signal-content-viewer">
      {signal.correlationId ? (
        <p className="font-mono text-[10px] text-foreground-subtle">
          correlation: {signal.correlationId}
        </p>
      ) : null}

      {signal.kind === 'agent_trace' && traceId ? (
        <p className="font-mono text-[10px] text-foreground-subtle" data-testid="signal-trace-id">
          trace: {traceId}
        </p>
      ) : null}

      {signal.kind === 'deploy' && commitSha ? (
        <p className="font-mono text-[10px] text-foreground-subtle">commit: {commitSha}</p>
      ) : null}

      {httpLink ? (
        <ExternalLinkRow
          href={httpLink}
          label={
            signal.kind === 'ci'
              ? 'Open CI run'
              : signal.kind === 'deploy'
                ? 'Open deployment'
                : 'Open link'
          }
        />
      ) : null}

      {fileRef ? <CopyableMono value={fileRef} label="Artifact reference" /> : null}

      {previewText ? (
        looksLikeMarkdown ? (
          <MarkdownPreview content={previewText} />
        ) : (
          <pre
            className="mt-2 max-h-64 overflow-auto rounded border border-border/60 bg-black/20 p-2 text-xs whitespace-pre-wrap"
            data-testid="signal-text-preview"
          >
            {previewText}
          </pre>
        )
      ) : fileRef && !previewText ? (
        <p className="mt-2 text-xs text-muted-foreground" data-testid="signal-no-inline-content">
          No inline preview stored — reference path only. Re-attach with{' '}
          <code className="text-[10px]">content_preview</code> or open the artifact reference locally.
        </p>
      ) : null}

      <JsonPayloadPanel payload={payload} />
    </div>
  );
}
