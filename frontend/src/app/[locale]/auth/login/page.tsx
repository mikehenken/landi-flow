import { AuthForm } from '@/components/auth/auth-form';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({
  searchParams,
}: LoginPageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const redirectPath = params.redirect ?? '/workspace/inbox';
  const t = await getTranslations('auth');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <AuthForm mode="login" redirectPath={redirectPath} />
      <p className="text-sm text-muted-foreground">
        {t('login.no_account')}{' '}
        <Link href="/auth/signup" className="text-brand-primary underline-offset-4 hover:underline">
          {t('login.signup_link')}
        </Link>
      </p>
    </main>
  );
}
