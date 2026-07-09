'use client';

import * as React from 'react';
import { TerminologyProvider } from '@landi-flow/ui';
import type { ResolvedWorkspace } from '@/lib/workspace/registry';
import { isMockAuthEnabled } from '@/lib/api/config';
import { getMockWorkspacePatch } from '@/lib/mock/settings-completion-store';
import { ensureUserWorkspace, listWorkspaces } from '@/lib/api/workspace-api';
import { useSupabaseSession } from '@/lib/supabase/session-provider';
import { toResolvedWorkspace } from '@/lib/workspace/to-resolved-workspace';
import { usePathname, useRouter } from '@/i18n/navigation';
import { WorkspaceProvider } from '@/lib/workspace/workspace-provider';
import { isWorkspaceUuid } from '@/lib/workspace/is-workspace-uuid';

const WORKSPACE_RESOLVE_TIMEOUT_MS = 15_000;

function isPublicAuthPath(pathname: string): boolean {
  return pathname.includes('/auth/login') || pathname.includes('/auth/signup');
}

function loginRedirectPath(pathname: string): string {
  if (pathname.startsWith('/workspace') || pathname.startsWith('/settings') || pathname.startsWith('/onboarding')) {
    return pathname;
  }
  return '/workspace/inbox';
}

function persistWorkspaceCookie(workspaceId: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `workspace-id=${encodeURIComponent(workspaceId)}; path=/; samesite=lax`;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

function workspaceResolveErrorMessage(resolveError: unknown): string {
  const base =
    resolveError instanceof Error ? resolveError.message : 'Failed to resolve workspace';
  const lower = base.toLowerCase();
  if (
    lower.includes('pgrst106') ||
    lower.includes('invalid schema') ||
    lower.includes('linear_clone')
  ) {
    return `${base}. Supabase must expose the linear_clone schema to PostgREST (see docs/setup/supabase-postgrest-schema.md).`;
  }
  if (lower.includes('timed out')) {
    return `${base}. Check FLOW_API_URL / Workers API health, then reload or retry.`;
  }
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('authentication') || lower.includes('session missing')) {
    return `${base}. Sign in again, then retry.`;
  }
  return `${base}. Reload the page or retry below.`;
}

export interface ActiveWorkspaceProviderProps {
  initialWorkspace: ResolvedWorkspace;
  children: React.ReactNode;
}

/**
 * Resolves the authenticated user's real workspace (UUID) from the Workers API.
 * Mock auth keeps the demo registry workspace unchanged.
 */
export function ActiveWorkspaceProvider({
  initialWorkspace,
  children,
}: ActiveWorkspaceProviderProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const onAuthPage = isPublicAuthPath(pathname);
  const { user, isReady: sessionReady } = useSupabaseSession();
  const userId = user?.id ?? null;
  const pathnameRef = React.useRef(pathname);
  pathnameRef.current = pathname;
  const resolvedUserIdRef = React.useRef<string | null>(null);
  const resolvedWorkspaceIdRef = React.useRef<string | null>(null);
  const lastResolveAttemptRef = React.useRef(-1);
  const [workspace, setWorkspace] = React.useState<ResolvedWorkspace>(() => {
    if (!isMockAuthEnabled()) {
      return initialWorkspace;
    }
    const patch = getMockWorkspacePatch();
    return {
      ...initialWorkspace,
      ...(patch.name ? { name: patch.name } : {}),
      ...(patch.icon_url !== undefined ? { icon_url: patch.icon_url } : {}),
    };
  });
  const [error, setError] = React.useState<string | null>(null);
  const [resolveAttempt, setResolveAttempt] = React.useState(0);
  const [redirectingToLogin, setRedirectingToLogin] = React.useState(false);

  const handlePatchWorkspace = React.useCallback(
    (patch: Partial<Pick<ResolvedWorkspace, 'name' | 'icon_url'>>) => {
      setWorkspace((current) => ({
        ...current,
        ...patch,
        updated_at: new Date().toISOString(),
      }));
    },
    [],
  );

  React.useEffect(() => {
    if (isMockAuthEnabled() || onAuthPage) {
      return;
    }

    if (!sessionReady) {
      return;
    }

    if (userId) {
      setRedirectingToLogin(false);
      return;
    }

    resolvedUserIdRef.current = null;
    resolvedWorkspaceIdRef.current = null;
    lastResolveAttemptRef.current = -1;
    setRedirectingToLogin(true);
    setError(null);
    router.replace({
      pathname: '/auth/login',
      query: { redirect: loginRedirectPath(pathnameRef.current) },
    });
  }, [onAuthPage, router, sessionReady, userId]);

  React.useEffect(() => {
    if (isMockAuthEnabled()) {
      return;
    }

    if (onAuthPage) {
      return;
    }

    if (!sessionReady || !userId || !user) {
      return;
    }

    const alreadyResolvedForAttempt =
      resolvedUserIdRef.current === userId &&
      resolvedWorkspaceIdRef.current !== null &&
      lastResolveAttemptRef.current === resolveAttempt;

    if (alreadyResolvedForAttempt) {
      return;
    }

    lastResolveAttemptRef.current = resolveAttempt;
    setError(null);

    let cancelled = false;

    void (async () => {
      try {
        await withTimeout(
          (async () => {
            const displayName =
              (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
              (typeof user.user_metadata?.name === 'string' && user.user_metadata.name) ||
              user.email?.split('@')[0] ||
              null;

            const memberships = await listWorkspaces();

            if (isWorkspaceUuid(initialWorkspace.id)) {
              const match = memberships.find((entry) => entry.id === initialWorkspace.id);
              if (match) {
                if (!cancelled) {
                  setWorkspace(toResolvedWorkspace(match));
                  persistWorkspaceCookie(match.id);
                  resolvedUserIdRef.current = userId;
                  resolvedWorkspaceIdRef.current = match.id;
                }
                return;
              }
            }

            const existingMembership = memberships[0];
            if (existingMembership) {
              if (!cancelled) {
                setWorkspace(toResolvedWorkspace(existingMembership));
                persistWorkspaceCookie(existingMembership.id);
                resolvedUserIdRef.current = userId;
                resolvedWorkspaceIdRef.current = existingMembership.id;
              }
              return;
            }

            const resolved = await ensureUserWorkspace(userId, displayName);
            if (cancelled) {
              return;
            }
            setWorkspace(toResolvedWorkspace(resolved));
            persistWorkspaceCookie(resolved.id);
            resolvedUserIdRef.current = userId;
            resolvedWorkspaceIdRef.current = resolved.id;
          })(),
          WORKSPACE_RESOLVE_TIMEOUT_MS,
          'Workspace resolve',
        );
      } catch (resolveError) {
        if (cancelled) {
          return;
        }
        resolvedUserIdRef.current = null;
        resolvedWorkspaceIdRef.current = null;
        setError(workspaceResolveErrorMessage(resolveError));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialWorkspace.id, onAuthPage, resolveAttempt, sessionReady, user, userId]);

  if (onAuthPage && !isMockAuthEnabled()) {
    return (
      <WorkspaceProvider workspace={initialWorkspace} onPatchWorkspace={handlePatchWorkspace}>
        {children}
      </WorkspaceProvider>
    );
  }

  if (redirectingToLogin && !isMockAuthEnabled()) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-muted-foreground">
        Redirecting to sign in.
      </div>
    );
  }

  if (!sessionReady && !isMockAuthEnabled()) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-muted-foreground">
        Loading workspace.
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 px-6 text-center"
        role="alert"
      >
        <p className="text-sm font-medium text-destructive">Failed to load workspace</p>
        <p className="max-w-md text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
          onClick={() => setResolveAttempt((attempt) => attempt + 1)}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <WorkspaceProvider workspace={workspace} onPatchWorkspace={handlePatchWorkspace}>
      <TerminologyProvider terminology={workspace.parsedSettings.terminology}>
        {children}
      </TerminologyProvider>
    </WorkspaceProvider>
  );
}
