import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@landi-flow/ui';

/** Auth-gated workspace membership overview (separate from PM shell). */
export default async function WorkspaceAccountPage(): Promise<React.ReactElement> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirect=/workspace/account');
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle();

  const profile = profileRow as { display_name: string | null; avatar_url: string | null } | null;

  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('role, status, workspace_id')
    .eq('user_id', user.id);

  type MembershipRow = {
    role: string;
    status: string;
    workspace_id: string;
  };

  const memberRows: MembershipRow[] = (memberships ?? []) as MembershipRow[];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Workspace Account</h1>
        <p className="text-muted-foreground">
          Signed in as {profile?.display_name ?? user.email ?? user.id}
        </p>
      </header>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-3 text-lg font-medium">Memberships</h2>
        {memberRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No workspace yet. Onboarding will create your first workspace.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {memberRows.map((member) => (
              <li key={member.workspace_id}>
                {member.workspace_id} — {member.role} ({member.status})
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action="/auth/signout" method="post" className="flex gap-3">
        <Button type="submit" variant="secondary">
          Sign out
        </Button>
      </form>
    </main>
  );
}
