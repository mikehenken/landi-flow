import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { ApiWorkerEnv } from '../middleware/auth.js';

export class MemberInviteError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'MemberInviteError';
    this.code = code;
  }
}

export function isMemberInviteError(err: unknown): err is MemberInviteError {
  return err instanceof MemberInviteError;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function assertValidInviteEmail(email: string): string {
  const normalized = normalizeInviteEmail(email);
  if (!EMAIL_PATTERN.test(normalized)) {
    throw new MemberInviteError('Invalid email address', 'invalid_email');
  }
  return normalized;
}

function createAuthAdminClient(env: ApiWorkerEnv): SupabaseClient {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new MemberInviteError('Invite service is not configured', 'service_unavailable');
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function findAuthUserIdByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<string | null> {
  const normalized = normalizeInviteEmail(email);
  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new MemberInviteError(
        `Failed to look up user by email: ${error.message}`,
        'auth_lookup_failed',
      );
    }

    const hit = data.users.find((user) => (user.email ?? '').toLowerCase() === normalized);
    if (hit) {
      return hit.id;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

function isExistingUserInviteError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('already been registered') ||
    lower.includes('already registered') ||
    lower.includes('email_exists') ||
    lower.includes('user already exists')
  );
}

export interface ResolveOrInviteUserInput {
  email: string;
  displayName?: string;
  redirectTo?: string;
}

export interface ResolvedInviteUser {
  userId: string;
  email: string;
  invitedViaAuth: boolean;
}

/** Resolve an auth user id by email, inviting new users through Supabase Auth when needed. */
export async function resolveOrInviteUserByEmail(
  env: ApiWorkerEnv,
  input: ResolveOrInviteUserInput,
): Promise<ResolvedInviteUser> {
  const email = assertValidInviteEmail(input.email);
  const admin = createAuthAdminClient(env);

  const redirectTo =
    input.redirectTo ??
    (env.NEXT_PUBLIC_SITE_URL ? `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/auth/callback` : undefined);

  const inviteOptions: Parameters<typeof admin.auth.admin.inviteUserByEmail>[1] = {};
  if (input.displayName) {
    inviteOptions.data = { display_name: input.displayName };
  }
  if (redirectTo) {
    inviteOptions.redirectTo = redirectTo;
  }

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    inviteOptions,
  );

  if (!inviteError && inviteData.user) {
    return {
      userId: inviteData.user.id,
      email: inviteData.user.email ?? email,
      invitedViaAuth: true,
    };
  }

  if (inviteError && !isExistingUserInviteError(inviteError.message)) {
    throw new MemberInviteError(inviteError.message, 'invite_failed');
  }

  const existingUserId = await findAuthUserIdByEmail(admin, email);
  if (!existingUserId) {
    throw new MemberInviteError(
      inviteError?.message ?? 'Unable to invite or locate user by email',
      'invite_failed',
    );
  }

  return {
    userId: existingUserId,
    email,
    invitedViaAuth: false,
  };
}

/** Batch-fetch auth emails for workspace member rows (service-role only). */
export async function fetchAuthEmailsByUserIds(
  env: ApiWorkerEnv,
  userIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(userIds.filter((id) => id.length > 0))];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const admin = createAuthAdminClient(env);
  const emailByUserId = new Map<string, string>();

  await Promise.all(
    uniqueIds.map(async (userId) => {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error || !data.user?.email) {
        return;
      }
      emailByUserId.set(userId, data.user.email);
    }),
  );

  return emailByUserId;
}

export type { User };
