import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseUserClientConfig } from '@landi-flow/auth/env';
import { getTranslations } from 'next-intl/server';
import { AccountPageContent } from '@/components/account-page-content';
import { CURRENT_USER } from '@/lib/agent-roster';
import { DEMO_WORKSPACE_ID } from '@/lib/seed-data';

interface AccountPageProps {
  params: Promise<{ locale: string }>;
}

function isMockAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';
}

/** Auth-gated workspace membership overview (separate from PM shell). */
export default async function WorkspaceAccountPage({
  params,
}: AccountPageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  await getTranslations({ locale, namespace: 'navigation' });

  if (isMockAuthEnabled() || !hasSupabaseUserClientConfig(process.env)) {
    return (
      <AccountPageContent
        displayName={CURRENT_USER.name}
        email="demo@landi.flow"
        memberships={[
          {
            workspaceId: DEMO_WORKSPACE_ID,
            role: 'admin',
            status: 'active',
          },
        ]}
      />
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error('[account] getUser failed:', userError.message);
    }

    if (!user) {
      redirect({
        href: {
          pathname: '/auth/login',
          query: { redirect: '/workspace/account' },
        },
        locale,
      });
      throw new Error('Redirecting to login');
    }

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle();

    const profile = profileRow as
      | { display_name: string | null; avatar_url: string | null }
      | null;

    const { data: memberships, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role, status, workspace_id')
      .eq('user_id', user.id);

    if (membershipError) {
      console.error('[account] workspace_members query failed:', membershipError.message);
    }

    type MembershipRow = {
      role: string;
      status: string;
      workspace_id: string;
    };

    const memberRows: MembershipRow[] = (memberships ?? []) as MembershipRow[];

    return (
      <AccountPageContent
        displayName={profile?.display_name ?? user.email ?? user.id}
        email={user.email ?? null}
        memberships={memberRows.map((member) => ({
          workspaceId: member.workspace_id,
          role: member.role,
          status: member.status,
        }))}
      />
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Redirecting to login') {
      throw error;
    }

    console.error('[account] Unexpected error, falling back to demo profile:', error);

    return (
      <AccountPageContent
        displayName={CURRENT_USER.name}
        email="demo@landi.flow"
        memberships={[
          {
            workspaceId: DEMO_WORKSPACE_ID,
            role: 'admin',
            status: 'active',
          },
        ]}
      />
    );
  }
}
