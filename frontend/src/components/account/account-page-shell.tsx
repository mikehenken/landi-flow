'use client';

import * as React from 'react';
import { useTranslations } from '@landi-flow/ui';
import { Link } from '@/i18n/navigation';

export interface AccountPageShellProps {
  viewTitle: string;
  segment: string;
  children: React.ReactNode;
}

const ACCOUNT_SEGMENTS = [
  { slug: 'preferences', label: 'Preferences' },
  { slug: 'profile', label: 'Profile' },
  { slug: 'notifications', label: 'Notifications' },
  { slug: 'security', label: 'Security' },
] as const;

/** Centered account settings layout with segment subnav (CAP-109–112). */
export function AccountPageShell({
  viewTitle,
  segment,
  children,
}: AccountPageShellProps): React.ReactElement {
  const t = useTranslations('navigation');

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <header className="space-y-2">
        <p className="text-sm">
          <Link href="/workspace/account" className="text-muted-foreground hover:text-foreground">
            ← {t('account.title')}
          </Link>
        </p>
        <h1 className="text-3xl font-semibold">{viewTitle}</h1>
      </header>

      <nav
        className="flex flex-wrap gap-2 border-b border-border pb-4"
        aria-label="Account settings"
        data-testid="account-segment-nav"
      >
        {ACCOUNT_SEGMENTS.map((item) => (
          <Link
            key={item.slug}
            href={`/workspace/account/${item.slug}`}
            className={`rounded-md px-3 py-1.5 text-sm ${
              segment === item.slug
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
            aria-current={segment === item.slug ? 'page' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </main>
  );
}
