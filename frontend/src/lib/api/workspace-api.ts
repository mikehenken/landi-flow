import type { Workspace } from '@landi-flow/core/types';
import { apiFetch, apiList } from '@/lib/api/client';

export interface CreateWorkspaceInput {
  slug: string;
  name: string;
  icon_url?: string | null;
}

export async function listWorkspaces(): Promise<Workspace[]> {
  return apiList<Workspace>('workspaces');
}

export async function createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
  const response = await apiFetch<{ workspace: Workspace }>('workspaces', {
    method: 'POST',
    body: input,
  });
  return response.workspace;
}

/** Stable slug for first-time workspace bootstrap (per authenticated user). */
export function buildDefaultWorkspaceInput(userKey: string, displayName?: string | null): CreateWorkspaceInput {
  const normalizedKey = userKey.replace(/[^a-z0-9]/gi, '').slice(0, 12).toLowerCase() || 'user';
  const suffix = normalizedKey.length >= 4 ? normalizedKey : `u${normalizedKey}`;
  const trimmedName = displayName?.trim();
  return {
    slug: `workspace-${suffix}`,
    name: trimmedName ? `${trimmedName}'s Workspace` : 'My Workspace',
  };
}

export async function ensureUserWorkspace(
  userKey: string,
  displayName?: string | null,
): Promise<Workspace> {
  const existing = await listWorkspaces();
  if (existing.length > 0) {
    return existing[0]!;
  }

  const primary = buildDefaultWorkspaceInput(userKey, displayName);
  try {
    return await createWorkspace(primary);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!message.toLowerCase().includes('slug') && !message.toLowerCase().includes('unique')) {
      throw error;
    }
    const fallbackSlug = `${primary.slug}-${Date.now().toString(36)}`;
    return createWorkspace({ ...primary, slug: fallbackSlug });
  }
}
