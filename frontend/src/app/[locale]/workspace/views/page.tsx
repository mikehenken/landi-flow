'use client';

import { AppShell } from '@/components/app-shell';
import { SavedViewsIndex } from '@/components/views/saved-views-index';
import { useTranslations } from '@landi-flow/ui';

export default function SavedViewsPage(): React.ReactElement {
  const tNav = useTranslations('navigation');

  return (
    <AppShell viewTitle="Views" breadcrumbs={[tNav('views.workspace'), 'Views']}>
      <SavedViewsIndex />
    </AppShell>
  );
}
