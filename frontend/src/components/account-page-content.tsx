'use client';

import * as React from 'react';
import { Button, useTranslations } from '@landi-flow/ui';
import { Link } from '@/i18n/navigation';
import { AppShell } from '@/components/app-shell';
import { StoryDetailLayoutSettingRow } from '@/components/story-detail-layout-toggle';

export interface AccountMembershipRow {
  workspaceId: string;
  workspaceName: string;
  role: string;
  status: string;
}

export interface AccountPageContentProps {
  displayName: string;
  email: string | null;
  memberships: AccountMembershipRow[];
}

function resolvePrimaryLabel(displayName: string, email: string | null): string {
  const trimmedName = displayName.trim();
  if (trimmedName.length > 0) {
    return trimmedName;
  }
  if (email && email.trim().length > 0) {
    return email.trim();
  }
  return 'Account';
}

export function AccountPageContent({
  displayName,
  email,
  memberships,
}: AccountPageContentProps): React.ReactElement {
  const t = useTranslations('navigation');
  const primaryLabel = resolvePrimaryLabel(displayName, email);
  const showEmailSeparately =
    email !== null &&
    email.trim().length > 0 &&
    email.trim().toLowerCase() !== primaryLabel.trim().toLowerCase();

  return (
    <AppShell viewTitle={t('account.title')} breadcrumbs={[t('views.workspace'), t('account.title')]}>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 sm:p-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">{t('account.title')}</h1>
          <p className="text-muted-foreground" data-testid="account-display-name">
            {primaryLabel}
          </p>
          {showEmailSeparately ? (
            <p className="text-sm text-muted-foreground" data-testid="account-email">
              {email}
            </p>
          ) : null}
        </header>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-3 text-lg font-medium">{t('views.workspace')}</h2>
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No workspace yet. Onboarding will create your first workspace.
            </p>
          ) : (
            <ul className="space-y-2 text-sm" data-testid="account-memberships">
              {memberships.map((member) => (
                <li key={member.workspaceId}>
                  <span className="font-medium">{member.workspaceName}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    — {member.role} ({member.status})
                  </span>
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
      </div>
    </AppShell>
  );
}
