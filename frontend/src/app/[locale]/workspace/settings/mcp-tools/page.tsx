'use client';

import { AppShell } from '@/components/app-shell';
import { SettingsSubnav } from '@/components/settings-subnav';
import { McpIdeToolsPanel } from '@/components/mcp/mcp-ide-tools-panel';
import { useTranslations } from '@landi-flow/ui';

export default function McpToolsSettingsPage(): React.ReactElement {
  const t = useTranslations('settings');

  return (
    <AppShell viewTitle="MCP tools" breadcrumbs={['Workspace', t('title'), 'MCP tools']}>
      <div className="flex h-full flex-col gap-6 p-6 lg:flex-row">
        <aside className="lg:w-48">
          <SettingsSubnav />
        </aside>
        <div className="min-w-0 flex-1">
          <McpIdeToolsPanel />
        </div>
      </div>
    </AppShell>
  );
}
