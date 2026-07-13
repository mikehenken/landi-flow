'use client';

import * as React from 'react';
import { cn, useTranslations } from '@landi-flow/ui';
import { Link, usePathname } from '@/i18n/navigation';

export interface SettingsSubnavProps {
  className?: string;
}

const SETTINGS_LINKS = [
  { href: '/workspace/settings/general', key: 'general' as const },
  { href: '/workspace/settings/members', key: 'members' as const },
  { href: '/workspace/settings/teams', label: 'Teams' },
  { href: '/workspace/settings/security', label: 'Security' },
  { href: '/workspace/settings/billing', label: 'Billing · Coming soon' },
  { href: '/workspace/settings/apps', label: 'Apps' },
  { href: '/workspace/settings/import', label: 'Import' },
  { href: '/workspace/settings/taxonomy', label: 'Taxonomy' },
  { href: '/workspace/settings/labels', label: 'Labels' },
  { href: '/workspace/settings/cycles', label: 'Cycles' },
  { href: '/workspace/settings/recurring-stories', label: 'Recurring stories' },
  { href: '/workspace/settings/mcp-tools', label: 'MCP tools' },
] as const;

export function SettingsSubnav({ className }: SettingsSubnavProps): React.ReactElement {
  const pathname = usePathname();
  const t = useTranslations('navigation');

  return (
    <nav
      aria-label={t('settings.section')}
      className={cn('flex flex-col gap-1', className)}
    >
      {SETTINGS_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            'rounded-md px-3 py-2 text-sm text-muted-foreground',
            'hover:bg-surface-overlay hover:text-foreground',
            pathname === link.href && 'bg-surface-overlay font-medium text-foreground',
          )}
        >
          {'label' in link ? link.label : t(`settings.${link.key}`)}
        </Link>
      ))}
    </nav>
  );
}
