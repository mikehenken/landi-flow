'use client';

import * as React from 'react';
import { StoreHydrator } from '@/components/store-hydrator';
import { WorkspaceShellProvider } from '@/components/workspace-shell-provider';

/**
 * Shell renders immediately; StoreHydrator gates only the main content pane so
 * navigation feels instant while domain stores load or refresh in the background.
 */
export function WorkspaceLayoutClient({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <WorkspaceShellProvider>
      <StoreHydrator>{children}</StoreHydrator>
    </WorkspaceShellProvider>
  );
}
