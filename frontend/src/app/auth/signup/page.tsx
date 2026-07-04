import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';

export const dynamic = 'force-dynamic';

export default function SignupPage(): React.ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <AuthForm mode="signup" redirectPath="/workspace/inbox" />
      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
