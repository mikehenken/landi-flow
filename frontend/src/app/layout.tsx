import type { ReactNode } from 'react';

/**
 * Passthrough root layout — localized pages render html/body in `[locale]/layout.tsx`.
 * API routes and OAuth callbacks use this minimal wrapper per next-intl App Router pattern.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): ReactNode {
  return children;
}
