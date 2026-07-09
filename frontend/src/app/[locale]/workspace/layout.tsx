import { WorkspaceLayoutClient } from '@/components/workspace-layout-client';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

/** Persistent PM shell + domain store hydration for workspace routes. */
export default function WorkspaceLayout({
  children,
}: WorkspaceLayoutProps): React.ReactElement {
  return <WorkspaceLayoutClient>{children}</WorkspaceLayoutClient>;
}
