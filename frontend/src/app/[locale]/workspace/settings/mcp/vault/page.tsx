'use client';

import * as React from 'react';
import { useTranslations } from '@landi-flow/ui';
import { SettingsPageShell } from '@/components/settings/settings-page-shell';
import { McpCredentialVaultPanel } from '@/components/settings/settings-fhitm-panels';

export default function McpCredentialVaultPage(): React.ReactElement {
  const t = useTranslations('navigation');

  return (
    <SettingsPageShell
      viewTitle="MCP credential vault"
      breadcrumbs={[t('views.workspace'), t('settings.title'), 'MCP', 'Vault']}
    >
      <McpCredentialVaultPanel />
    </SettingsPageShell>
  );
}
