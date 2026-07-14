'use client';

import * as React from 'react';
import { useTranslations } from '@landi-flow/ui';
import { AppShell } from '@/components/app-shell';
import { SettingsSubnav } from '@/components/settings-subnav';
import { StoryDetailLayoutSettingRow } from '@/components/story-detail-layout-toggle';
import { WorkspaceGeneralSettingsPanel } from '@/components/settings/admin-settings-panels';

export default function WorkspaceSettingsGeneralPage(): React.ReactElement {
  const t = useTranslations('navigation');

  return (
    <AppShell
      viewTitle={t('settings.general')}
      breadcrumbs={[t('views.workspace'), t('settings.title'), t('settings.general')]}
    >
      <div className="flex h-full flex-col gap-6 p-6 lg:flex-row">
        <aside className="lg:w-48">
          <SettingsSubnav />
        </aside>
        <div className="min-w-0 flex-1 space-y-6">
          <WorkspaceGeneralSettingsPanel />
          <StoryDetailLayoutSettingRow />
        </div>
      </div>
    </AppShell>
  );
}
