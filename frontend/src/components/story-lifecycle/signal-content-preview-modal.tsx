'use client';

import * as React from 'react';
import { Button, cn, InstantMarkdownEditor } from '@landi-flow/ui';
import { ArrowLeft, Copy, Check, X } from 'lucide-react';
import type { EngineeringSignalView } from '@/lib/story-lifecycle/story-signals';
import {
  buildSignalContentExcerpt,
  detectSignalContentType,
  extractSignalContentContext,
  extractSignalFullContent,
  formatJsonForDisplay,
  formatJsonlLines,
  parseCsvRows,
  type SignalContentType,
} from '@/lib/story-lifecycle/signal-content-type';

export interface SignalContentPreviewModalProps {
  signal: EngineeringSignalView;
  open: boolean;
  onClose: () => void;
}

function CopyButton({ value }: { value: string }): React.ReactElement {
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
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 px-2 text-xs"
      onClick={() => void handleCopy()}
      data-testid="signal-preview-copy"
    >
      {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

function JsonBody({ content }: { content: string }): React.ReactElement {
  const formatted = formatJsonForDisplay(content);
  return (
    <pre
      className="overflow-auto rounded-md border border-border/60 bg-black/30 p-3 font-mono text-xs leading-relaxed text-foreground"
      data-testid="signal-preview-json"
    >
      {formatted}
    </pre>
  );
}

function JsonlBody({ content }: { content: string }): React.ReactElement {
  const lines = formatJsonlLines(content);
  return (
    <div className="space-y-3" data-testid="signal-preview-jsonl">
      {lines.map((entry) => (
        <div key={entry.lineNumber} className="rounded-md border border-border/60 bg-black/20">
          <div className="border-b border-border/40 px-2 py-1 text-[10px] uppercase text-foreground-subtle">
            Line {entry.lineNumber}
          </div>
          <pre className="overflow-x-auto p-2 font-mono text-xs leading-relaxed text-foreground">
            {entry.formatted}
          </pre>
        </div>
      ))}
    </div>
  );
}

function CsvBody({ content }: { content: string }): React.ReactElement {
  const rows = parseCsvRows(content);
  const header = rows[0] ?? [];
  const bodyRows = rows.slice(1);

  return (
    <div
      className="overflow-auto rounded-md border border-border/60"
      data-testid="signal-preview-csv"
    >
      <table className="w-full min-w-[320px] border-collapse text-left text-xs">
        <thead className="bg-black/30">
          <tr>
            {header.map((cell, index) => (
              <th
                key={`header-${index}`}
                className="border-b border-border/60 px-2 py-1.5 font-medium text-foreground"
              >
                {cell || `Column ${index + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`} className="odd:bg-black/10">
              {header.map((_, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className="border-b border-border/40 px-2 py-1.5 text-muted-foreground"
                >
                  {row[cellIndex] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarkdownBody({ content }: { content: string }): React.ReactElement {
  return (
    <div
      className="rounded-md border border-border/60 bg-black/20 p-3"
      data-testid="signal-preview-markdown"
    >
      <InstantMarkdownEditor
        value={content}
        readOnly
        variant="compact"
        aria-label="Signal content preview"
      />
    </div>
  );
}

function TextBody({ content }: { content: string }): React.ReactElement {
  return (
    <pre
      className="overflow-auto whitespace-pre-wrap rounded-md border border-border/60 bg-black/20 p-3 font-mono text-xs leading-relaxed text-foreground"
      data-testid="signal-preview-text"
    >
      {content}
    </pre>
  );
}

function ContentRenderer({
  content,
  contentType,
}: {
  content: string;
  contentType: SignalContentType;
}): React.ReactElement {
  switch (contentType) {
    case 'markdown':
      return <MarkdownBody content={content} />;
    case 'json':
      return <JsonBody content={content} />;
    case 'jsonl':
      return <JsonlBody content={content} />;
    case 'csv':
      return <CsvBody content={content} />;
    case 'text':
    default:
      return <TextBody content={content} />;
  }
}

/** Full-screen overlay preview for signal / artifact body content. */
export function SignalContentPreviewModal({
  signal,
  open,
  onClose,
}: SignalContentPreviewModalProps): React.ReactElement | null {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  const fullContent = React.useMemo(
    () => extractSignalFullContent(signal.payload),
    [signal.payload],
  );

  const context = React.useMemo(
    () => extractSignalContentContext(signal.payload, signal.kind),
    [signal.payload, signal.kind],
  );

  const detected = React.useMemo(() => {
    if (!fullContent) {
      return null;
    }
    return detectSignalContentType(fullContent, context);
  }, [fullContent, context]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !fullContent || !detected) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      data-testid="signal-content-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${signal.title}`}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className={cn(
          'flex max-h-[min(90vh,900px)] w-full max-w-3xl flex-col overflow-hidden',
          'rounded-xl border border-border bg-surface-overlay shadow-2xl',
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start gap-2 border-b border-border px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-0.5 h-8 w-8 shrink-0 px-0"
            onClick={onClose}
            aria-label="Back to signals"
            data-testid="signal-preview-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-foreground">{signal.title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {signal.kind.replace(/_/g, ' ')}
              {signal.status ? ` · ${signal.status}` : ''}
              {' · '}
              {detected.label}
            </p>
          </div>
          <CopyButton value={fullContent} />
          <Button
            ref={closeButtonRef}
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 px-0"
            onClick={onClose}
            aria-label="Close preview"
            data-testid="signal-preview-close"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="mb-3 text-xs text-muted-foreground" data-testid="signal-preview-excerpt">
            {buildSignalContentExcerpt(fullContent, 120)}
          </p>
          <ContentRenderer content={fullContent} contentType={detected.type} />
        </div>
      </div>
    </div>
  );
}
