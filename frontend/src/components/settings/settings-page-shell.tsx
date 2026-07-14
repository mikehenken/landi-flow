'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { SettingsSubnav } from '@/components/settings-subnav';

export interface SettingsPageShellProps {
  viewTitle: string;
  breadcrumbs: string[];
  children: React.ReactNode;
}

/** Shared AppShell + settings subnav layout for FHITM settings surfaces. */
export function SettingsPageShell({
  viewTitle,
  breadcrumbs,
  children,
}: SettingsPageShellProps): React.ReactElement {
  return (
    <AppShell viewTitle={viewTitle} breadcrumbs={breadcrumbs}>
      <div className="flex h-full flex-col gap-6 p-6 lg:flex-row">
        <aside className="lg:w-48">
          <SettingsSubnav />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </AppShell>
  );
}
