'use client';

import * as React from 'react';
import { useTranslations } from '@landi-flow/ui';
import { AppShell } from '@/components/app-shell';
import { SettingsSubnav } from '@/components/settings-subnav';
import { StoryDetailLayoutSettingRow } from '@/components/story-detail-layout-toggle';
import {
  ImportExportPanel,
  SecuritySettingsPanel,
  SlaRulesPanel,
  TeamsAdminPanel,
  WorkspaceGeneralSettingsPanel,
} from '@/components/settings/admin-settings-panels';
import {
  ApplicationMembersPanel,
  AuthorizedAppsPanel,
} from '@/components/settings/personal-settings-panels';

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

export function WorkspaceSettingsTeamsPage(): React.ReactElement {
  const t = useTranslations('navigation');
  return (
    <AppShell viewTitle="Teams" breadcrumbs={[t('views.workspace'), t('settings.title'), 'Teams']}>
      <div className="flex h-full flex-col gap-6 p-6 lg:flex-row">
        <aside className="lg:w-48"><SettingsSubnav /></aside>
        <div className="min-w-0 flex-1"><TeamsAdminPanel /></div>
      </div>
    </AppShell>
  );
}

export function WorkspaceSettingsSecurityPage(): React.ReactElement {
  const t = useTranslations('navigation');
  return (
    <AppShell viewTitle="Security" breadcrumbs={[t('views.workspace'), t('settings.title'), 'Security']}>
      <div className="flex h-full flex-col gap-6 p-6 lg:flex-row">
        <aside className="lg:w-48"><SettingsSubnav /></aside>
        <div className="min-w-0 flex-1 space-y-6">
          <SecuritySettingsPanel />
          <SlaRulesPanel />
        </div>
      </div>
    </AppShell>
  );
}

export function WorkspaceSettingsAppsPage(): React.ReactElement {
  const t = useTranslations('navigation');
  return (
    <AppShell viewTitle="Apps" breadcrumbs={[t('views.workspace'), t('settings.title'), 'Apps']}>
      <div className="flex h-full flex-col gap-6 p-6 lg:flex-row">
        <aside className="lg:w-48"><SettingsSubnav /></aside>
        <div className="min-w-0 flex-1 space-y-6">
          <ApplicationMembersPanel />
          <AuthorizedAppsPanel />
        </div>
      </div>
    </AppShell>
  );
}

export function WorkspaceSettingsImportPage(): React.ReactElement {
  const t = useTranslations('navigation');
  return (
    <AppShell viewTitle="Import" breadcrumbs={[t('views.workspace'), t('settings.title'), 'Import']}>
      <div className="flex h-full flex-col gap-6 p-6 lg:flex-row">
        <aside className="lg:w-48"><SettingsSubnav /></aside>
        <div className="min-w-0 flex-1"><ImportExportPanel /></div>
      </div>
    </AppShell>
  );
}
