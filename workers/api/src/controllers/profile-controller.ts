import type { CorrelationContext, UserNotificationPrefs } from '@landi-flow/core/types';
import { BaseController } from './base-controller.js';

export interface ProfileUpdateInput {
  display_name?: string;
  avatar_url?: string | null;
  timezone?: string;
  locale?: string;
  settings?: Record<string, unknown>;
}

export interface NotificationPrefsInput {
  email_enabled?: boolean;
  slack_enabled?: boolean;
  in_app_enabled?: boolean;
  digest?: UserNotificationPrefs['digest'];
}

export class ProfileController extends BaseController {
  async getProfile(): Promise<{
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    timezone: string;
    locale: string;
    settings: Record<string, unknown>;
  }> {
    const { data, error } = await this.db
      .from('profiles')
      .select('user_id, display_name, avatar_url, timezone, locale, settings')
      .eq('user_id', this.userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load profile: ${error.message}`);
    }

    if (!data) {
      throw new Error('Profile not found');
    }

    return data as {
      user_id: string;
      display_name: string;
      avatar_url: string | null;
      timezone: string;
      locale: string;
      settings: Record<string, unknown>;
    };
  }

  async updateProfile(
    input: ProfileUpdateInput,
    ctx: CorrelationContext,
  ): Promise<{ profile: Record<string, unknown>; correlation_id: string }> {
    const patch: Record<string, unknown> = {};
    if (input.display_name !== undefined) patch.display_name = input.display_name;
    if (input.avatar_url !== undefined) patch.avatar_url = input.avatar_url;
    if (input.timezone !== undefined) patch.timezone = input.timezone;
    if (input.locale !== undefined) patch.locale = input.locale;
    if (input.settings !== undefined) patch.settings = input.settings;

    const { data, error } = await this.db
      .from('profiles')
      .update(patch)
      .eq('user_id', this.userId)
      .select('user_id, display_name, avatar_url, timezone, locale, settings')
      .single();

    if (error || !data) {
      throw new Error(`Failed to update profile: ${error?.message ?? 'unknown error'}`);
    }

    return { profile: data as Record<string, unknown>, correlation_id: ctx.correlation_id };
  }

  async leaveWorkspace(
    workspaceId: string,
    ctx: CorrelationContext,
  ): Promise<{ ok: true; correlation_id: string }> {
    const { error } = await this.db
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', this.userId);

    if (error) {
      throw new Error(`Failed to leave workspace: ${error.message}`);
    }

    return { ok: true, correlation_id: ctx.correlation_id };
  }

  async getNotificationPrefs(workspaceId: string): Promise<UserNotificationPrefs> {
    await this.assertWorkspaceMember(workspaceId);

    const { data, error } = await this.db
      .from('user_notification_prefs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', this.userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load notification prefs: ${error.message}`);
    }

    if (data) {
      return data as UserNotificationPrefs;
    }

    return {
      user_id: this.userId,
      workspace_id: workspaceId,
      email_enabled: true,
      slack_enabled: false,
      in_app_enabled: true,
      digest: 'immediate',
      updated_at: new Date().toISOString(),
    };
  }

  async updateNotificationPrefs(
    workspaceId: string,
    input: NotificationPrefsInput,
    ctx: CorrelationContext,
  ): Promise<{ prefs: UserNotificationPrefs; correlation_id: string }> {
    await this.assertWorkspaceMember(workspaceId);

    const { data, error } = await this.db
      .from('user_notification_prefs')
      .upsert({
        user_id: this.userId,
        workspace_id: workspaceId,
        email_enabled: input.email_enabled ?? true,
        slack_enabled: input.slack_enabled ?? false,
        in_app_enabled: input.in_app_enabled ?? true,
        digest: input.digest ?? 'immediate',
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to update notification prefs: ${error?.message ?? 'unknown error'}`);
    }

    return { prefs: data as UserNotificationPrefs, correlation_id: ctx.correlation_id };
  }
}
