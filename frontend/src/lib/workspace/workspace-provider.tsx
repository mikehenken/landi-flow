'use client';

import * as React from 'react';
import type { ResolvedWorkspace } from '@/lib/workspace/registry';

export interface WorkspaceContextValue {
  workspace: ResolvedWorkspace;
  patchWorkspace?: (patch: Partial<Pick<ResolvedWorkspace, 'name' | 'icon_url'>>) => void;
}

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(null);

export interface WorkspaceProviderProps {
  workspace: ResolvedWorkspace;
  children: React.ReactNode;
  onPatchWorkspace?: (patch: Partial<Pick<ResolvedWorkspace, 'name' | 'icon_url'>>) => void;
}

/** Supplies the active multi-tenant Workspace to client components. */
export function WorkspaceProvider({
  workspace,
  children,
  onPatchWorkspace,
}: WorkspaceProviderProps): React.ReactElement {
  const value = React.useMemo(
    () => ({
      workspace,
      patchWorkspace: onPatchWorkspace,
    }),
    [workspace, onPatchWorkspace],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = React.useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return ctx;
}

/** Safe variant for optional workspace context (e.g. auth pages). */
export function useWorkspaceOptional(): WorkspaceContextValue | null {
  return React.useContext(WorkspaceContext);
}
