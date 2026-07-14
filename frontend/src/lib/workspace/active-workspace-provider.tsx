'use client';

import * as React from 'react';
import { TerminologyProvider } from '@landi-flow/ui';
import type { ResolvedWorkspace } from '@/lib/workspace/registry';
import { isMockAuthEnabled } from '@/lib/api/config';
import { getMockWorkspacePatch } from '@/lib/mock/settings-completion-store';
import { ensureUserWorkspace, listWorkspaces } from '@/lib/api/workspace-api';
import { useSupabaseSession } from '@/lib/supabase/session-provider';
import { isAuthFailure, recoverSessionAndRedirect } from '@/lib/auth/recover-session';
import { toResolvedWorkspace } from '@/lib/workspace/to-resolved-workspace';
import { usePathname } from '@/i18n/navigation';
import { WorkspaceProvider } from '@/lib/workspace/workspace-provider';
import { isWorkspaceUuid } from '@/lib/workspace/is-workspace-uuid';
import { WorkspaceBootstrapSkeleton } from '@/components/workspace-bootstrap-skeleton';
import { prefetchWorkspaceBootstrap } from '@/lib/api/workspace-bootstrap';

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
    lower.includes('linear_clone') ||
    lower.includes('workspace_members')
  ) {
    return 'Unable to load your workspace. Check that the database is configured for this app, then reload or retry.';
  }
  if (lower.includes('timed out')) {
    return 'Workspace lookup timed out. Check API health, then reload or retry.';
  }
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('authentication') || lower.includes('session missing')) {
    return 'Your session expired. Sign in again, then retry.';
  }
  // Strip schema/table identifiers from any residual message.
  const sanitized = base
    .replace(/linear_clone(?:\.\w+)?/gi, 'workspace data')
    .replace(/\bworkspace_members\b/gi, 'workspace membership');
  return `${sanitized}. Reload the page or retry below.`;
}

export interface ActiveWorkspaceProviderProps {
  initialWorkspace: ResolvedWorkspace;
  /** Server-verified Supabase session — avoids client bootstrap race to login. */
  serverAuthenticated?: boolean;
  children: React.ReactNode;
}

/**
 * Resolves the authenticated user's real workspace (UUID) from the Workers API.
 * Mock auth keeps the demo registry workspace unchanged.
 *
 * Shell-first: while the session is resolving, render children with the
 * initial workspace + a lightweight bootstrap hint instead of blanking the tree.
 */
export function ActiveWorkspaceProvider({
  initialWorkspace,
  serverAuthenticated = false,
  children,
}: ActiveWorkspaceProviderProps): React.ReactElement {
  const pathname = usePathname();
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
  const [sessionPending, setSessionPending] = React.useState(
    () => !isMockAuthEnabled() && !sessionReady && serverAuthenticated,
  );

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

  const handleSwitchWorkspace = React.useCallback(
    (next: ResolvedWorkspace): void => {
      persistWorkspaceCookie(next.id);
      resolvedWorkspaceIdRef.current = next.id;
      if (userId) {
        resolvedUserIdRef.current = userId;
      }
      lastResolveAttemptRef.current = resolveAttempt;
      setError(null);
      setWorkspace(next);
      // PERF-03: warm full aggregate while StoreHydrator remounts (matches StoreHydrator phase).
      if (!isMockAuthEnabled() && isWorkspaceUuid(next.id)) {
        prefetchWorkspaceBootstrap(next.id, 'full');
      }
    },
    [resolveAttempt, userId],
  );

  // PERF-03: when SSR/cookie already seeded a workspace UUID, warm the full
  // aggregate immediately so StoreHydrator can hit the shared cache (shell-first).
  React.useEffect(() => {
    if (isMockAuthEnabled() || onAuthPage) {
      return;
    }
    if (!isWorkspaceUuid(workspace.id)) {
      return;
    }
    prefetchWorkspaceBootstrap(workspace.id, 'full');
  }, [onAuthPage, workspace.id]);

  React.useEffect(() => {
    if (isMockAuthEnabled() || onAuthPage) {
      setSessionPending(false);
      return;
    }

    if (!sessionReady) {
      // Shell-first only when SSR already verified a session.
      setSessionPending(serverAuthenticated);
      return;
    }

    setSessionPending(false);

    if (userId) {
      setRedirectingToLogin(false);
      return;
    }

    // SSR verified a session — wait for client cookie hydration instead of redirecting.
    if (serverAuthenticated) {
      return;
    }

    // Client bootstrap finished with no user and SSR had no session — sign in again.
    resolvedUserIdRef.current = null;
    resolvedWorkspaceIdRef.current = null;
    lastResolveAttemptRef.current = -1;
    setRedirectingToLogin(true);
    setError(null);
    void recoverSessionAndRedirect(loginRedirectPath(pathnameRef.current));
  }, [onAuthPage, serverAuthenticated, sessionReady, userId]);

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

            // Prefer an already soft-switched / cookie-selected workspace when still a membership.
            const preferredId =
              resolvedWorkspaceIdRef.current && isWorkspaceUuid(resolvedWorkspaceIdRef.current)
                ? resolvedWorkspaceIdRef.current
                : isWorkspaceUuid(initialWorkspace.id)
                  ? initialWorkspace.id
                  : null;

            if (preferredId) {
              const match = memberships.find((entry) => entry.id === preferredId);
              if (match) {
                if (!cancelled) {
                  setWorkspace(toResolvedWorkspace(match));
                  persistWorkspaceCookie(match.id);
                  resolvedUserIdRef.current = userId;
                  resolvedWorkspaceIdRef.current = match.id;
                  // PERF-03: overlap full bootstrap with StoreHydrator mount.
                  prefetchWorkspaceBootstrap(match.id, 'full');
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
                prefetchWorkspaceBootstrap(existingMembership.id, 'full');
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
            if (isWorkspaceUuid(resolved.id)) {
              prefetchWorkspaceBootstrap(resolved.id, 'full');
            }
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
        if (isAuthFailure(resolveError)) {
          setRedirectingToLogin(true);
          setError(null);
          void recoverSessionAndRedirect(loginRedirectPath(pathnameRef.current));
          return;
        }
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
      <WorkspaceProvider workspace={workspace} onPatchWorkspace={handlePatchWorkspace}>
        <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-muted-foreground">
          Redirecting to sign in.
        </div>
      </WorkspaceProvider>
    );
  }

  // Unauthenticated cold start — keep a compact status until session resolves or redirects.
  if (!sessionReady && !serverAuthenticated && !isMockAuthEnabled()) {
    return (
      <WorkspaceProvider workspace={workspace} onPatchWorkspace={handlePatchWorkspace}>
        <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-muted-foreground">
          Loading workspace.
        </div>
      </WorkspaceProvider>
    );
  }

  if (error) {
    return (
      <WorkspaceProvider
        workspace={workspace}
        onPatchWorkspace={handlePatchWorkspace}
        onSwitchWorkspace={handleSwitchWorkspace}
      >
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
      </WorkspaceProvider>
    );
  }

  return (
    <WorkspaceProvider
      workspace={workspace}
      onPatchWorkspace={handlePatchWorkspace}
      onSwitchWorkspace={handleSwitchWorkspace}
    >
      <TerminologyProvider terminology={workspace.parsedSettings.terminology}>
        {sessionPending ? (
          <>
            <WorkspaceBootstrapSkeleton />
            {children}
          </>
        ) : (
          children
        )}
      </TerminologyProvider>
    </WorkspaceProvider>
  );
}
