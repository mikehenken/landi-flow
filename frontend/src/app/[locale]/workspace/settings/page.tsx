import { redirect } from '@/i18n/navigation';

interface WorkspaceSettingsIndexPageProps {
  params: Promise<{ locale: string }>;
}

export default async function WorkspaceSettingsIndexPage({
  params,
}: WorkspaceSettingsIndexPageProps): Promise<never> {
  const { locale } = await params;

  redirect({
    href: '/workspace/settings/general',
    locale,
  });

  throw new Error('Redirecting to workspace settings');
}
