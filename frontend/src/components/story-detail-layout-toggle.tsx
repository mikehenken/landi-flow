'use client';

import * as React from 'react';
import { Button, cn, useTranslations } from '@landi-flow/ui';
import { LayoutPanelLeft, Square } from 'lucide-react';
import { useStoryDetailLayout } from '@/components/story-detail-layout-context';
import type { StoryDetailLayoutMode } from '@/lib/story-detail-layout-preference';

export interface StoryDetailLayoutToggleProps {
  /** Compact icon-only toggle for panel headers. */
  compact?: boolean;
  className?: string;
}

/** Toggle between sidebar and modal story detail layout (CR-09r-006). */
export function StoryDetailLayoutToggle({
  compact = false,
  className,
}: StoryDetailLayoutToggleProps): React.ReactElement {
  const t = useTranslations('navigation');
  const { layout, setLayout } = useStoryDetailLayout();

  const nextMode: StoryDetailLayoutMode = layout === 'sidebar' ? 'modal' : 'sidebar';
  const label =
    layout === 'sidebar'
      ? t('story_detail.layout_sidebar_active')
      : t('story_detail.layout_modal_active');

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(compact ? 'px-2' : undefined, className)}
      aria-pressed={layout === 'modal'}
      aria-label={t('story_detail.layout_toggle', { mode: nextMode })}
      title={label}
      onClick={() => setLayout(nextMode)}
    >
      {layout === 'sidebar' ? (
        <Square className="h-4 w-4" />
      ) : (
        <LayoutPanelLeft className="h-4 w-4" />
      )}
      {!compact ? (
        <span className="ml-1.5 text-xs">{t(`story_detail.layout_${layout}`)}</span>
      ) : null}
    </Button>
  );
}

export interface StoryDetailLayoutSettingRowProps {
  className?: string;
}

/** Full-width setting row for account / workspace settings pages. */
export function StoryDetailLayoutSettingRow({
  className,
}: StoryDetailLayoutSettingRowProps): React.ReactElement {
  const t = useTranslations('navigation');
  const { layout, setLayout } = useStoryDetailLayout();

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <h3 className="text-sm font-medium text-foreground">
          {t('story_detail.setting_title')}
        </h3>
        <p className="text-sm text-muted-foreground">{t('story_detail.setting_description')}</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('story_detail.setting_title')}>
        {(['sidebar', 'modal'] as const).map((mode) => (
          <Button
            key={mode}
            type="button"
            size="sm"
            variant={layout === mode ? 'default' : 'secondary'}
            aria-pressed={layout === mode}
            onClick={() => setLayout(mode)}
          >
            {t(`story_detail.layout_${mode}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}
