'use client';

import * as React from 'react';
import { SettingsPageShell } from '@/components/settings/settings-page-shell';
import { ConnectedAccountsPanel } from '@/components/settings/personal-settings-panels';

export default function ConnectedAccountsPage(): React.ReactElement {
  return (
    <SettingsPageShell
      viewTitle="Connected accounts"
      breadcrumbs={['Workspace', 'Account', 'Connected accounts']}
    >
      <ConnectedAccountsPanel />
    </SettingsPageShell>
  );
}
