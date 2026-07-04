import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';

export const dynamic = 'force-dynamic';

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const redirectPath = params.redirect ?? '/workspace';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <AuthForm mode="login" redirectPath={redirectPath} />
      <p className="text-sm text-muted-foreground">
        No account?{' '}
        <Link href="/auth/signup" className="text-brand-primary underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}
