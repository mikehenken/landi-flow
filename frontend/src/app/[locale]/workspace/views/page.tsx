'use client';

import { AppShell } from '@/components/app-shell';
import { SavedViewsIndex } from '@/components/views/saved-views-index';
import { useTranslations } from '@landi-flow/ui';

export default function SavedViewsPage(): React.ReactElement {
  const t = useTranslations('views');

  return (
    <AppShell viewTitle="Views" breadcrumbs={[t('workspace'), 'Views']}>
      <SavedViewsIndex />
    </AppShell>
  );
}
