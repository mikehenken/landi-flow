'use client';

import * as React from 'react';
import { Button, useTranslations } from '@landi-flow/ui';
import { Link } from '@/i18n/navigation';
import { StoryDetailLayoutProvider } from '@/components/story-detail-layout-context';
import { StoryDetailLayoutSettingRow } from '@/components/story-detail-layout-toggle';

export interface AccountPageContentProps {
  displayName: string;
  email: string | null;
  memberships: Array<{ workspaceId: string; role: string; status: string }>;
}

export function AccountPageContent({
  displayName,
  email,
  memberships,
}: AccountPageContentProps): React.ReactElement {
  const t = useTranslations('navigation');

  return (
    <StoryDetailLayoutProvider>
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
        <header className="space-y-2">
          <p className="text-sm">
            <Link
              href="/workspace/inbox"
              className="text-muted-foreground hover:text-foreground"
            >
              ← {t('views.inbox')}
            </Link>
          </p>
          <h1 className="text-3xl font-semibold">{t('account.title')}</h1>
          <p className="text-muted-foreground">{displayName}</p>
          {email ? <p className="text-sm text-muted-foreground">{email}</p> : null}
        </header>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-3 text-lg font-medium">{t('views.workspace')}</h2>
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No workspace yet. Onboarding will create your first workspace.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {memberships.map((member) => (
                <li key={member.workspaceId}>
                  {member.workspaceId} — {member.role} ({member.status})
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <StoryDetailLayoutSettingRow />
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-2 text-lg font-medium">{t('settings.title')}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t('settings.account_hint')}</p>
          <Button asChild variant="secondary" size="sm">
            <Link href="/workspace/settings/general">{t('settings.open_workspace')}</Link>
          </Button>
        </section>

        <form action="/auth/signout" method="post" className="flex gap-3">
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </main>
    </StoryDetailLayoutProvider>
  );
}
