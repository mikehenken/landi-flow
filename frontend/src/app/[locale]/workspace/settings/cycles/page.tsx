'use client';

import { AppShell } from '@/components/app-shell';
import { SettingsSubnav } from '@/components/settings-subnav';
import { CyclesPanel } from '@/components/cycles/cycles-panel';
import { useTranslations } from '@landi-flow/ui';

export default function CyclesSettingsPage(): React.ReactElement {
  const t = useTranslations('settings');

  return (
    <AppShell viewTitle="Cycles" breadcrumbs={['Workspace', t('title'), 'Cycles']}>
      <div className="flex h-full flex-col gap-6 p-6 lg:flex-row">
        <aside className="lg:w-48">
          <SettingsSubnav />
        </aside>
        <div className="min-w-0 flex-1">
          <CyclesPanel />
        </div>
      </div>
    </AppShell>
  );
}
