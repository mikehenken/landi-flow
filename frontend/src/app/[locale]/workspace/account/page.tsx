import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseUserClientConfig } from '@landi-flow/auth/env';
import { getTranslations } from 'next-intl/server';
import { AccountPageContent } from '@/components/account-page-content';
import { CURRENT_USER } from '@/lib/agent-roster';
import { DEMO_WORKSPACE_ID } from '@/lib/seed-data';
import { getWorkspaceById } from '@/lib/workspace/registry';

interface AccountPageProps {
  params: Promise<{ locale: string }>;
}

function isMockAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';
}

function resolveDisplayName(
  profileName: string | null | undefined,
  email: string | null | undefined,
  userId: string,
): string {
  const trimmed = profileName?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  if (email && email.trim().length > 0) {
    return email.trim();
  }
  return userId;
}

/** Auth-gated workspace membership overview inside the PM shell. */
export default async function WorkspaceAccountPage({
  params,
}: AccountPageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  await getTranslations({ locale, namespace: 'navigation' });

  if (isMockAuthEnabled() || !hasSupabaseUserClientConfig(process.env)) {
    const demoWorkspace = getWorkspaceById(DEMO_WORKSPACE_ID);
    return (
      <AccountPageContent
        displayName={CURRENT_USER.name}
        email="demo@landi.flow"
        memberships={[
          {
            workspaceId: DEMO_WORKSPACE_ID,
            workspaceName: demoWorkspace?.name ?? 'Landi Flow',
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
    const workspaceIds = memberRows.map((member) => member.workspace_id);
    const workspaceNameById = new Map<string, string>();

    if (workspaceIds.length > 0) {
      const { data: workspaceRows, error: workspaceError } = await supabase
        .schema('linear_clone')
        .from('workspaces')
        .select('id, name')
        .in('id', workspaceIds);

      if (workspaceError) {
        console.error('[account] workspaces query failed:', workspaceError.message);
      } else {
        for (const row of workspaceRows ?? []) {
          const id = String((row as { id: string }).id);
          const name = String((row as { name: string }).name ?? '').trim();
          if (name.length > 0) {
            workspaceNameById.set(id, name);
          }
        }
      }
    }

    const email = user.email ?? null;
    const displayName = resolveDisplayName(profile?.display_name, email, user.id);

    return (
      <AccountPageContent
        displayName={displayName}
        email={email}
        memberships={memberRows.map((member) => ({
          workspaceId: member.workspace_id,
          workspaceName: workspaceNameById.get(member.workspace_id) ?? 'Workspace',
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

    const demoWorkspace = getWorkspaceById(DEMO_WORKSPACE_ID);
    return (
      <AccountPageContent
        displayName={CURRENT_USER.name}
        email="demo@landi.flow"
        memberships={[
          {
            workspaceId: DEMO_WORKSPACE_ID,
            workspaceName: demoWorkspace?.name ?? 'Landi Flow',
            role: 'admin',
            status: 'active',
          },
        ]}
      />
    );
  }
}
