import { StoreHydrator } from '@/components/store-hydrator';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

/** Domain store hydration runs only under authenticated workspace routes. */
export default function WorkspaceLayout({
  children,
}: WorkspaceLayoutProps): React.ReactElement {
  return <StoreHydrator>{children}</StoreHydrator>;
}
