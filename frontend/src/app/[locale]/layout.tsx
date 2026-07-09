import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { AssignableMembersProvider } from '@/hooks/use-assignable-members';
import { CollaborationProvider } from '@/components/collaboration';
import { SupabaseSessionProvider } from '@/lib/supabase/session-provider';
import { ActiveWorkspaceProvider } from '@/lib/workspace/active-workspace-provider';
import {
  getWorkspaceById,
  resolveWorkspaceFromHost,
} from '@/lib/workspace/registry';
import { routing } from '@/i18n/routing';
import { isRtlLocale } from '@landi-flow/ui';
import '../globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Landi Flow',
  description:
    'Open-source Linear-class PM with native human+AI collaboration — Epic and Story nomenclature.',
  openGraph: {
    title: 'Landi Flow',
    description: 'Easier than Linear — keyboard-first PM with governed AI agents.',
    images: ['/assets/og/og-image.jpg'],
  },
  icons: {
    icon: '/assets/favicons/favicon-master.jpg',
  },
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps): Promise<React.ReactElement> {
  const { locale } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const cookieStore = await cookies();
  const headersList = await headers();
  const workspaceId =
    cookieStore.get('workspace-id')?.value ??
    resolveWorkspaceFromHost(headersList.get('host')).id;
  const workspace = getWorkspaceById(workspaceId) ?? resolveWorkspaceFromHost(null);

  return (
    <html
      lang={locale}
      dir={isRtlLocale(locale) ? 'rtl' : 'ltr'}
      className="dark h-full"
    >
      <body className="h-full antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SupabaseSessionProvider>
            <ActiveWorkspaceProvider initialWorkspace={workspace}>
              <CollaborationProvider>
                <AssignableMembersProvider>
                  {children}
                </AssignableMembersProvider>
              </CollaborationProvider>
            </ActiveWorkspaceProvider>
          </SupabaseSessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
