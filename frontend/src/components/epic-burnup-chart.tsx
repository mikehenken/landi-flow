'use client';

import * as React from 'react';
import type { EpicProgressSummary } from '@/lib/epic-progress';
import { cn } from '@landi-flow/ui';

export interface EpicBurnupChartProps {
  progress: EpicProgressSummary;
  className?: string;
}

const CHART_WIDTH = 280;
const CHART_HEIGHT = 120;
const PADDING = { top: 8, right: 8, bottom: 20, left: 28 };

function buildPolyline(
  points: Array<{ x: number; y: number }>,
): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

/** CAP-048: SVG burn-up chart — scope vs completed story counts over time. */
export function EpicBurnupChart({
  progress,
  className,
}: EpicBurnupChartProps): React.ReactElement {
  const { burnup, totalStories, completedStories, percentComplete } = progress;

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const maxY = Math.max(1, ...burnup.map((point) => point.scope));

  const toX = (index: number): number => {
    if (burnup.length <= 1) {
      return PADDING.left + plotWidth / 2;
    }
    return PADDING.left + (index / (burnup.length - 1)) * plotWidth;
  };

  const toY = (value: number): number =>
    PADDING.top + plotHeight - (value / maxY) * plotHeight;

  const scopePoints = burnup.map((point, index) => ({
    x: toX(index),
    y: toY(point.scope),
  }));

  const completedPoints = burnup.map((point, index) => ({
    x: toX(index),
    y: toY(point.completed),
  }));

  const firstLabel = burnup[0]?.date.slice(5) ?? '';
  const lastLabel = burnup[burnup.length - 1]?.date.slice(5) ?? '';

  return (
    <section
      className={cn('rounded-lg border border-border bg-surface-elevated/30 p-3', className)}
      data-testid="epic-burnup-chart"
      data-cap="CAP-048"
      aria-label="Epic progress burn-up chart"
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Progress
        </h3>
        <span className="font-mono text-sm tabular-nums text-foreground">
          {percentComplete}%
        </span>
      </div>

      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`${completedStories} of ${totalStories} stories completed`}
      >
        <line
          x1={PADDING.left}
          y1={PADDING.top + plotHeight}
          x2={PADDING.left + plotWidth}
          y2={PADDING.top + plotHeight}
          className="stroke-border"
          strokeWidth={1}
        />
        <line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={PADDING.left}
          y2={PADDING.top + plotHeight}
          className="stroke-border"
          strokeWidth={1}
        />

        {scopePoints.length > 0 ? (
          <path
            d={buildPolyline(scopePoints)}
            fill="none"
            className="stroke-muted-foreground/60"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        ) : null}

        {completedPoints.length > 0 ? (
          <path
            d={buildPolyline(completedPoints)}
            fill="none"
            className="stroke-primary"
            strokeWidth={2}
          />
        ) : null}

        <text
          x={PADDING.left}
          y={CHART_HEIGHT - 4}
          className="fill-muted-foreground text-[9px]"
        >
          {firstLabel}
        </text>
        <text
          x={PADDING.left + plotWidth}
          y={CHART_HEIGHT - 4}
          textAnchor="end"
          className="fill-muted-foreground text-[9px]"
        >
          {lastLabel}
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-0.5 w-3 rounded bg-primary" aria-hidden="true" />
          Completed ({completedStories})
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="h-0.5 w-3 rounded border-t border-dashed border-muted-foreground/60"
            aria-hidden="true"
          />
          Scope ({totalStories})
        </span>
      </div>
    </section>
  );
}
