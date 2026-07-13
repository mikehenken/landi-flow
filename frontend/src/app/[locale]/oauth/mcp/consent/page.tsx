import { redirect } from 'next/navigation';
import { McpOAuthConsentForm } from '@/components/oauth/mcp-oauth-consent-form';
import { createClient } from '@/lib/supabase/server';
import {
  buildMcpConsentReturnPath,
  parseMcpOAuthParams,
  type McpOAuthAuthorizeParams,
} from '@/lib/oauth/mcp-consent';

export const dynamic = 'force-dynamic';

interface McpOAuthConsentPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function InvalidConsentRequest({ message }: { message: string }): React.ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="max-w-md rounded-lg border border-destructive/40 bg-card p-6 text-center">
        <h1 className="text-lg font-semibold text-destructive">Invalid authorization request</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}

export default async function McpOAuthConsentPage({
  params,
  searchParams,
}: McpOAuthConsentPageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  const rawParams = await searchParams;
  const parsed = parseMcpOAuthParams(rawParams);

  if (!parsed.ok) {
    return <InvalidConsentRequest message={parsed.error} />;
  }

  const oauthParams: McpOAuthAuthorizeParams = parsed.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const returnPath = buildMcpConsentReturnPath(oauthParams);
    redirect(`/${locale}/auth/login?redirect=${encodeURIComponent(returnPath)}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <McpOAuthConsentForm oauthParams={oauthParams} clientName={oauthParams.client_id} />
    </main>
  );
}
