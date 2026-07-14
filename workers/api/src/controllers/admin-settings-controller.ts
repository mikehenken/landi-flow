import type {
  ApplicationMember,
  AuthorizedOAuthApp,
  CorrelationContext,
  Team,
  WorkspaceInviteLink,
} from '@landi-flow/core/types';
import { BaseController } from './base-controller.js';

export interface TeamCreateInput {
  name: string;
  slug: string;
  key: string;
  visibility?: Team['visibility'];
}

export interface TeamUpdateInput {
  name?: string;
  slug?: string;
  key?: string;
  visibility?: Team['visibility'];
}

export interface InviteLinkCreateInput {
  label?: string | null;
  role?: string;
  max_uses?: number | null;
  expires_at?: string | null;
}

export interface CsvImportInput {
  csv_text: string;
  team_id: string;
  workflow_state_id: string;
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function createInviteToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '');
}

function parseCsvRows(csvText: string): Array<Record<string, string>> {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(',').map((header) => header.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });
}

export class AdminSettingsController extends BaseController {
  async createTeam(
    workspaceId: string,
    input: TeamCreateInput,
    ctx: CorrelationContext,
  ): Promise<{ team: Team; correlation_id: string }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { data, error } = await this.db
      .from('teams')
      .insert({
        workspace_id: workspaceId,
        name: input.name,
        slug: input.slug,
        key: input.key,
        visibility: input.visibility ?? 'public',
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create team: ${error?.message ?? 'unknown error'}`);
    }

    return { team: data as Team, correlation_id: ctx.correlation_id };
  }

  async updateTeam(
    workspaceId: string,
    teamId: string,
    input: TeamUpdateInput,
    ctx: CorrelationContext,
  ): Promise<{ team: Team; correlation_id: string }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.slug !== undefined) patch.slug = input.slug;
    if (input.key !== undefined) patch.key = input.key;
    if (input.visibility !== undefined) patch.visibility = input.visibility;

    const { data, error } = await this.db
      .from('teams')
      .update(patch)
      .eq('workspace_id', workspaceId)
      .eq('id', teamId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to update team: ${error?.message ?? 'unknown error'}`);
    }

    return { team: data as Team, correlation_id: ctx.correlation_id };
  }

  async listInviteLinks(workspaceId: string): Promise<WorkspaceInviteLink[]> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { data, error } = await this.db
      .from('workspace_invite_links')
      .select('id, workspace_id, label, role, max_uses, use_count, expires_at, revoked_at, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list invite links: ${error.message}`);
    }

    return (data ?? []) as WorkspaceInviteLink[];
  }

  async createInviteLink(
    workspaceId: string,
    input: InviteLinkCreateInput,
    ctx: CorrelationContext,
  ): Promise<{ invite: WorkspaceInviteLink; token: string; correlation_id: string }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const token = createInviteToken();
    const { data, error } = await this.db
      .from('workspace_invite_links')
      .insert({
        workspace_id: workspaceId,
        token_hash: await hashToken(token),
        label: input.label ?? null,
        role: input.role ?? 'member',
        max_uses: input.max_uses ?? null,
        expires_at: input.expires_at ?? null,
        created_by: this.userId,
      })
      .select('id, workspace_id, label, role, max_uses, use_count, expires_at, revoked_at, created_at')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create invite link: ${error?.message ?? 'unknown error'}`);
    }

    return {
      invite: data as WorkspaceInviteLink,
      token,
      correlation_id: ctx.correlation_id,
    };
  }

  async revokeInviteLink(
    workspaceId: string,
    inviteId: string,
    ctx: CorrelationContext,
  ): Promise<{ invite: WorkspaceInviteLink; correlation_id: string }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { data, error } = await this.db
      .from('workspace_invite_links')
      .update({ revoked_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('id', inviteId)
      .select('id, workspace_id, label, role, max_uses, use_count, expires_at, revoked_at, created_at')
      .single();

    if (error || !data) {
      throw new Error(`Failed to revoke invite link: ${error?.message ?? 'unknown error'}`);
    }

    return { invite: data as WorkspaceInviteLink, correlation_id: ctx.correlation_id };
  }

  async updateSecuritySettings(
    workspaceId: string,
    settings: { allowed_domains?: string[] },
    ctx: CorrelationContext,
  ): Promise<{ settings: Record<string, unknown>; correlation_id: string }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { data: workspace, error: fetchError } = await this.db
      .from('workspaces')
      .select('settings')
      .eq('id', workspaceId)
      .maybeSingle();

    if (fetchError || !workspace) {
      throw new Error(`Workspace not found: ${fetchError?.message ?? workspaceId}`);
    }

    const current = (workspace as { settings: Record<string, unknown> }).settings ?? {};
    const next = {
      ...current,
      security: {
        ...(typeof current.security === 'object' && current.security !== null
          ? (current.security as Record<string, unknown>)
          : {}),
        ...(settings.allowed_domains !== undefined
          ? { allowed_domains: settings.allowed_domains }
          : {}),
      },
    };

    const { data, error } = await this.db
      .from('workspaces')
      .update({ settings: next })
      .eq('id', workspaceId)
      .select('settings')
      .single();

    if (error || !data) {
      throw new Error(`Failed to update security settings: ${error?.message ?? 'unknown error'}`);
    }

    return {
      settings: (data as { settings: Record<string, unknown> }).settings,
      correlation_id: ctx.correlation_id,
    };
  }

  async listApplicationMembers(workspaceId: string): Promise<ApplicationMember[]> {
    await this.assertWorkspaceAdmin(workspaceId);

    const [appsResult, agentsResult] = await Promise.all([
      this.db
        .from('oauth_apps')
        .select('id, name, client_id, created_at')
        .eq('workspace_id', workspaceId)
        .is('revoked_at', null),
      this.db
        .from('agents')
        .select('id, display_name, oauth_app_id, created_at')
        .eq('workspace_id', workspaceId),
    ]);

    if (appsResult.error) {
      throw new Error(`Failed to list oauth apps: ${appsResult.error.message}`);
    }
    if (agentsResult.error) {
      throw new Error(`Failed to list agents: ${agentsResult.error.message}`);
    }

    const members: ApplicationMember[] = [];
    for (const app of appsResult.data ?? []) {
      const row = app as { id: string; name: string; client_id: string; created_at: string };
      members.push({
        id: row.id,
        name: row.name,
        kind: 'oauth_app',
        client_id: row.client_id,
        created_at: row.created_at,
      });
    }
    for (const agent of agentsResult.data ?? []) {
      const row = agent as {
        id: string;
        display_name: string;
        oauth_app_id: string | null;
        created_at: string;
      };
      members.push({
        id: row.id,
        name: row.display_name,
        kind: 'agent',
        client_id: row.oauth_app_id,
        created_at: row.created_at,
      });
    }

    return members.sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    );
  }

  async listAuthorizedApps(workspaceId: string): Promise<AuthorizedOAuthApp[]> {
    await this.assertWorkspaceMember(workspaceId);

    const { data: tokens, error } = await this.db
      .from('oauth_tokens')
      .select('id, client_id, scopes, created_at, expires_at')
      .eq('workspace_id', workspaceId)
      .eq('user_id', this.userId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list authorized apps: ${error.message}`);
    }

    const clientIds = [...new Set((tokens ?? []).map((token) => (token as { client_id: string }).client_id))];
    const clientNameById = new Map<string, string>();
    if (clientIds.length > 0) {
      const { data: clients } = await this.db
        .from('oauth_clients')
        .select('client_id, client_name')
        .in('client_id', clientIds);
      for (const client of clients ?? []) {
        const row = client as { client_id: string; client_name: string };
        clientNameById.set(row.client_id, row.client_name);
      }
    }

    return (tokens ?? []).map((token) => {
      const row = token as {
        id: string;
        client_id: string;
        scopes: string[];
        created_at: string;
        expires_at: string;
      };
      return {
        token_id: row.id,
        client_id: row.client_id,
        client_name: clientNameById.get(row.client_id) ?? row.client_id,
        scopes: row.scopes ?? [],
        created_at: row.created_at,
        expires_at: row.expires_at,
      };
    });
  }

  async revokeAuthorizedApp(
    workspaceId: string,
    tokenId: string,
    ctx: CorrelationContext,
  ): Promise<{ ok: true; correlation_id: string }> {
    await this.assertWorkspaceMember(workspaceId);

    const { error } = await this.db
      .from('oauth_tokens')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_reason: 'user_revocation',
      })
      .eq('workspace_id', workspaceId)
      .eq('user_id', this.userId)
      .eq('id', tokenId);

    if (error) {
      throw new Error(`Failed to revoke authorized app: ${error.message}`);
    }

    return { ok: true, correlation_id: ctx.correlation_id };
  }

  async importCsvStories(
    workspaceId: string,
    input: CsvImportInput,
    ctx: CorrelationContext,
  ): Promise<{ import_job_id: string; created_count: number; correlation_id: string }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const rows = parseCsvRows(input.csv_text);
    let createdCount = 0;

    const { data: job, error: jobError } = await this.db
      .from('import_jobs')
      .insert({
        workspace_id: workspaceId,
        source: 'csv',
        status: 'processing',
        correlation_id: ctx.correlation_id,
        created_by: this.userId,
        progress: { total: rows.length, created: 0 },
      })
      .select('id')
      .single();

    if (jobError || !job) {
      throw new Error(`Failed to create import job: ${jobError?.message ?? 'unknown error'}`);
    }

    const jobId = (job as { id: string }).id;

    for (const row of rows) {
      const title = row.title ?? row.name;
      if (!title) {
        continue;
      }

      const { error } = await this.db.rpc('execute_mutation_with_outbox', {
        p_op: 'create_story',
        p_workspace_id: workspaceId,
        p_topic: null,
        p_payload: {},
        p_correlation_id: ctx.correlation_id,
        p_causation_id: null,
        p_params: {
          team_id: input.team_id,
          workflow_state_id: input.workflow_state_id,
          title,
          description_md: row.description ?? null,
          priority: row.priority ?? 'none',
          created_by: this.userId,
        },
      });

      if (!error) {
        createdCount += 1;
      }
    }

    await this.db
      .from('import_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress: { total: rows.length, created: createdCount },
      })
      .eq('id', jobId);

    return {
      import_job_id: jobId,
      created_count: createdCount,
      correlation_id: ctx.correlation_id,
    };
  }
}
