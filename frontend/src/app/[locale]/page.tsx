import { redirect } from '@/i18n/navigation';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps): Promise<never> {
  const { locale } = await params;
  return redirect({ href: '/workspace/inbox', locale });
}
