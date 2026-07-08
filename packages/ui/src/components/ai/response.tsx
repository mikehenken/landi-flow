'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ResponseProps {
  /** Markdown source; may be a partial (streaming) fragment. */
  children: string;
  className?: string;
}

/**
 * Incremental Markdown renderer for streamed assistant text — the substrate for
 * the study's VITAL "instant markdown" requirement. Dependency-free and XSS-safe:
 * it builds React elements (never `dangerouslySetInnerHTML` on model output).
 *
 * Supported: fenced code blocks, ATX headings, unordered/ordered lists,
 * blockquotes, horizontal rules, paragraphs, and inline bold / italic / `code` /
 * links. Unrecognized syntax renders as plain text so partial tokens never throw.
 */
export const Response = React.memo(function Response({
  children,
  className,
}: ResponseProps): React.ReactElement {
  const blocks = React.useMemo(() => parseBlocks(children ?? ''), [children]);
  return (
    <div
      className={cn(
        'space-y-3 text-sm leading-relaxed text-foreground [word-break:break-word]',
        className,
      )}
    >
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
});

// --- block model -----------------------------------------------------------

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'code'; lang: string | null; code: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'hr' }
  | { kind: 'p'; text: string };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];

  let i = 0;
  let paragraph: string[] = [];

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'p', text: paragraph.join(' ').trim() });
      paragraph = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    // Fenced code block.
    const fence = /^```(.*)$/.exec(trimmed);
    if (fence) {
      flushParagraph();
      const lang = (fence[1] ?? '').trim() || null;
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test((lines[i] ?? '').trim())) {
        codeLines.push(lines[i] ?? '');
        i += 1;
      }
      i += 1; // consume closing fence (or EOF for a still-streaming block)
      blocks.push({ kind: 'code', lang, code: codeLines.join('\n') });
      continue;
    }

    if (trimmed === '') {
      flushParagraph();
      i += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ kind: 'hr' });
      i += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      blocks.push({
        kind: 'heading',
        level: (heading[1] ?? '#').length,
        text: (heading[2] ?? '').trim(),
      });
      i += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      flushParagraph();
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test((lines[i] ?? '').trim())) {
        quoteLines.push((lines[i] ?? '').trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ kind: 'quote', text: quoteLines.join(' ') });
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test((lines[i] ?? '').trim())) {
        items.push((lines[i] ?? '').trim().replace(/^[-*+]\s+/, ''));
        i += 1;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test((lines[i] ?? '').trim())) {
        items.push((lines[i] ?? '').trim().replace(/^\d+[.)]\s+/, ''));
        i += 1;
      }
      blocks.push({ kind: 'ol', items });
      continue;
    }

    paragraph.push(trimmed);
    i += 1;
  }
  flushParagraph();
  return blocks;
}

function renderBlock(block: Block, key: number): React.ReactElement {
  switch (block.kind) {
    case 'heading': {
      const sizes: Record<number, string> = {
        1: 'text-lg font-semibold',
        2: 'text-base font-semibold',
        3: 'text-sm font-semibold',
      };
      return (
        <p key={key} className={cn('text-foreground', sizes[block.level] ?? 'text-sm font-semibold')}>
          {renderInline(block.text)}
        </p>
      );
    }
    case 'code':
      return (
        <pre
          key={key}
          className="overflow-x-auto rounded-md border border-border bg-black/30 p-3 font-mono text-xs text-foreground"
        >
          <code data-lang={block.lang ?? undefined}>{block.code}</code>
        </pre>
      );
    case 'ul':
      return (
        <ul key={key} className="list-disc space-y-1 pl-5 text-sm text-foreground">
          {block.items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol key={key} className="list-decimal space-y-1 pl-5 text-sm text-foreground">
          {block.items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ol>
      );
    case 'quote':
      return (
        <blockquote
          key={key}
          className="border-l-2 border-border pl-3 text-sm italic text-muted-foreground"
        >
          {renderInline(block.text)}
        </blockquote>
      );
    case 'hr':
      return <hr key={key} className="border-border" />;
    case 'p':
    default:
      return (
        <p key={key} className="text-sm text-foreground">
          {renderInline(block.text)}
        </p>
      );
  }
}

// --- inline model ----------------------------------------------------------

/**
 * Tokenize inline markdown into React nodes. Order matters: code spans are
 * extracted first so their contents are never re-parsed for emphasis.
 */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*]+\*)|(_[^_]+_)|(\[[^\]]+\]\([^)]+\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`')) {
      nodes.push(
        <code
          key={`c-${key}`}
          className="rounded bg-black/30 px-1 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(
        <strong key={`b-${key}`} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link) {
        nodes.push(
          <a
            key={`a-${key}`}
            href={link[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80"
          >
            {link[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    } else {
      nodes.push(
        <em key={`i-${key}`} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = match.index + token.length;
    key += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}
