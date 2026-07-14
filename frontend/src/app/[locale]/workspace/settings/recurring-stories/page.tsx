'use client';

import { AppShell } from '@/components/app-shell';
import { SettingsSubnav } from '@/components/settings-subnav';
import { RecurringStoriesPanel } from '@/components/recurring-stories/recurring-stories-panel';
import { useTranslations } from '@landi-flow/ui';

export default function RecurringStoriesSettingsPage(): React.ReactElement {
  const t = useTranslations('settings');

  return (
    <AppShell
      viewTitle="Recurring stories"
      breadcrumbs={['Workspace', t('title'), 'Recurring stories']}
    >
      <div className="flex h-full flex-col gap-6 p-6 lg:flex-row">
        <aside className="lg:w-48">
          <SettingsSubnav />
        </aside>
        <div className="min-w-0 flex-1">
          <RecurringStoriesPanel />
        </div>
      </div>
    </AppShell>
  );
}
