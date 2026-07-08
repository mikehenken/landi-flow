'use client';

import * as React from 'react';
import { useTranslations } from '@landi-flow/ui';
import {
  ConnectedAccountsPanel,
  LeaveWorkspacePanel,
  NotificationPrefsPanel,
  PersonalApiKeysPanel,
  PersonalProfilePanel,
} from '@/components/settings/personal-settings-panels';

export default function AccountSettingsPage(): React.ReactElement {
  const t = useTranslations('navigation');

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-3xl font-semibold">{t('account.title')} settings</h1>
        <p className="text-sm text-muted-foreground">Personal profile, notifications, and security.</p>
      </header>
      <PersonalProfilePanel initialDisplayName="Demo User" />
      <NotificationPrefsPanel />
      <ConnectedAccountsPanel />
      <PersonalApiKeysPanel />
      <LeaveWorkspacePanel />
    </main>
  );
}
