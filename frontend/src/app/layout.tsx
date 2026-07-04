import type { Metadata } from 'next';
import { StoreHydrator } from '@/components/store-hydrator';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Landi Flow',
  description:
    'Open-source Linear-class PM with native human+AI collaboration — Epic and Story nomenclature.',
  openGraph: {
    title: 'Landi Flow',
    description: 'Easier than Linear — keyboard-first PM with governed AI agents.',
    images: ['/assets/og/og-image.jpg'],
  },
  icons: {
    icon: '/assets/favicons/favicon-master.jpg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full antialiased">
        <StoreHydrator>{children}</StoreHydrator>
      </body>
    </html>
  );
}
