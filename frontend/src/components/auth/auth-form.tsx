'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@landi-flow/ui';
import { createClient } from '@/lib/supabase/client';
import { buildOAuthRedirectUrl } from '@/lib/supabase/cookie-domain';
import type { OAuthProvider } from '@landi-flow/auth';

type AuthMode = 'login' | 'signup';

interface AuthFormProps {
  mode: AuthMode;
  redirectPath?: string;
}

export function AuthForm({ mode, redirectPath = '/workspace' }: AuthFormProps): React.ReactElement {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const oauthRedirect = buildOAuthRedirectUrl(redirectPath);

  async function handleOAuth(provider: OAuthProvider): Promise<void> {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: oauthRedirect },
    });
    setLoading(false);
    if (oauthError) {
      setError(oauthError.message);
    }
  }

  async function handleEmailAuth(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === 'signup') {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: oauthRedirect,
          data: displayName ? { full_name: displayName } : undefined,
        },
      });
      setLoading(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      router.push(redirectPath);
      router.refresh();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push(redirectPath);
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-lg border border-border bg-card p-8 shadow-sm">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === 'login' ? 'Sign in to Landi Flow' : 'Create your account'}
        </h1>
        <p className="text-sm text-muted-foreground">
          Google, GitHub, or email — real Supabase auth with workspace RBAC.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={loading}
          onClick={() => void handleOAuth('google')}
        >
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={loading}
          onClick={() => void handleOAuth('github')}
        >
          Continue with GitHub
        </Button>
      </div>

      <div className="relative text-center text-xs uppercase text-muted-foreground">
        <span className="bg-card px-2">or email</span>
        <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-border" />
      </div>

      <form className="flex flex-col gap-4" onSubmit={(e) => void handleEmailAuth(e)}>
        {mode === 'signup' ? (
          <Input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="name"
          />
        ) : null}
        <Input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />
        <Input
          type="password"
          placeholder="Password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}
        </Button>
      </form>
    </div>
  );
}
