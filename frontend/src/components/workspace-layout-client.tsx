'use client';

import * as React from 'react';
import { StoreHydrator } from '@/components/store-hydrator';
import { WorkspaceShellProvider } from '@/components/workspace-shell-provider';
import { useWorkspace } from '@/lib/workspace';

/**
 * Shell renders immediately; StoreHydrator gates only the main content pane so
 * navigation feels instant while domain stores load or refresh in the background.
 * Remount key on workspace id ensures soft workspace switches clear route UI.
 */
export function WorkspaceLayoutClient({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { workspace } = useWorkspace();

  return (
    <WorkspaceShellProvider>
      <StoreHydrator key={workspace.id}>{children}</StoreHydrator>
    </WorkspaceShellProvider>
  );
}
