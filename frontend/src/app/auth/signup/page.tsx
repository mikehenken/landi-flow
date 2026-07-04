import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';

export default function SignupPage(): React.ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <AuthForm mode="signup" redirectPath="/workspace" />
      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-brand-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
