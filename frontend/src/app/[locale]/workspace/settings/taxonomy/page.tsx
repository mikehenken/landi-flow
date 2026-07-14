'use client';

import { AppShell } from '@/components/app-shell';
import { SettingsSubnav } from '@/components/settings-subnav';
import { TaxonomySettingsPanel } from '@/components/settings/taxonomy-settings-panel';
import { useTranslations } from '@landi-flow/ui';

export default function TaxonomySettingsPage(): React.ReactElement {
  const t = useTranslations('settings');

  return (
    <AppShell
      viewTitle="Taxonomy & templates"
      breadcrumbs={['Workspace', t('title'), 'Taxonomy']}
    >
      <div className="flex h-full flex-col gap-6 p-6 lg:flex-row">
        <aside className="lg:w-48">
          <SettingsSubnav />
        </aside>
        <div className="min-w-0 flex-1">
          <TaxonomySettingsPanel />
        </div>
      </div>
    </AppShell>
  );
}
