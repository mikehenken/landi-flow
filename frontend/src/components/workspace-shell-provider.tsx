'use client';

import * as React from 'react';
import { usePathname } from '@/i18n/navigation';
import { AppShellFrame, type AppShellFrameProps } from '@/components/app-shell';

export interface WorkspacePageMeta {
  viewTitle: string;
  breadcrumbs?: string[];
  inspectorSlot?: React.ReactNode;
}

interface WorkspaceShellContextValue {
  setPageMeta: (meta: WorkspacePageMeta) => void;
}

const WorkspaceShellContext = React.createContext<WorkspaceShellContextValue | null>(null);

const DEFAULT_PAGE_META: WorkspacePageMeta = {
  viewTitle: 'Workspace',
  breadcrumbs: [],
};

/** Routes that render their own full-page chrome (no PM shell). */
function isStandaloneWorkspaceRoute(pathname: string): boolean {
  return (
    pathname === '/workspace/account' ||
    pathname.startsWith('/workspace/account/') ||
    pathname.startsWith('/workspace/dev/')
  );
}

export function WorkspaceShellProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const pathname = usePathname();
  const standalone = isStandaloneWorkspaceRoute(pathname);
  const [pageMeta, setPageMeta] = React.useState<WorkspacePageMeta>(DEFAULT_PAGE_META);

  const contextValue = React.useMemo(
    (): WorkspaceShellContextValue => ({
      setPageMeta,
    }),
    [],
  );

  if (standalone) {
    return <>{children}</>;
  }

  const shellProps: AppShellFrameProps = {
    viewTitle: pageMeta.viewTitle,
    breadcrumbs: pageMeta.breadcrumbs ?? [],
    inspectorSlot: pageMeta.inspectorSlot,
    children,
  };

  return (
    <WorkspaceShellContext.Provider value={contextValue}>
      <AppShellFrame {...shellProps} />
    </WorkspaceShellContext.Provider>
  );
}

/** Registers page chrome on the persistent workspace shell (no remount on nav). */
export function useWorkspacePageMeta({
  viewTitle,
  breadcrumbs = [],
  inspectorSlot,
}: WorkspacePageMeta): void {
  const context = React.useContext(WorkspaceShellContext);
  const breadcrumbsKey = breadcrumbs.join('\0');

  React.useLayoutEffect(() => {
    if (!context) {
      return;
    }
    context.setPageMeta({ viewTitle, breadcrumbs, inspectorSlot });
  }, [context, viewTitle, breadcrumbsKey, inspectorSlot, breadcrumbs]);
}

export function useWorkspaceShellContext(): WorkspaceShellContextValue | null {
  return React.useContext(WorkspaceShellContext);
}
