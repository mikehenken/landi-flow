import { AuthForm } from '@/components/auth/auth-form';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function SignupPage(): Promise<React.ReactElement> {
  const t = await getTranslations('auth');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <AuthForm mode="signup" redirectPath="/workspace/inbox" />
      <p className="text-sm text-muted-foreground">
        {t('signup.has_account')}{' '}
        <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
          {t('signup.login_link')}
        </Link>
      </p>
    </main>
  );
}
