import Link from 'next/link';
import type { ReactElement } from 'react';
import type { ExtensionCatalogItem } from '@landi-flow/core/types';

const OFFICIAL_EXTENSIONS: ExtensionCatalogItem[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    slug: 'github-sync',
    name: 'GitHub Sync',
    description: 'Mirror pull requests and CI signals into Landi Flow activity and triage.',
    manifest: { version: '1.0.0', icon: 'github', scopes: ['signals.read', 'signals.write'] },
    publisher: 'Landi',
    is_official: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    slug: 'slack-notifications',
    name: 'Slack Notifications',
    description: 'Post Story and Epic updates to Slack channels with workspace-scoped routing.',
    manifest: { version: '1.0.0', icon: 'slack', scopes: ['entity.story.read', 'entity.epic.read'] },
    publisher: 'Landi',
    is_official: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    slug: 'stripe-billing-bridge',
    name: 'Stripe Billing Bridge',
    description: 'Connect Stripe Checkout and Customer Portal to workspace entitlements.',
    manifest: { version: '1.0.0', icon: 'stripe', scopes: ['billing.read', 'billing.write'] },
    publisher: 'Landi',
    is_official: true,
    created_at: new Date().toISOString(),
  },
];

async function loadCatalog(): Promise<ExtensionCatalogItem[]> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (!apiBase) {
    return OFFICIAL_EXTENSIONS;
  }

  try {
    const response = await fetch(`${apiBase.replace(/\/$/, '')}/api/v1/extensions/catalog`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      return OFFICIAL_EXTENSIONS;
    }
    const body = (await response.json()) as { data?: ExtensionCatalogItem[] };
    return body.data && body.data.length > 0 ? body.data : OFFICIAL_EXTENSIONS;
  } catch {
    return OFFICIAL_EXTENSIONS;
  }
}

export default async function MarketplacePage(): Promise<ReactElement> {
  const extensions = await loadCatalog();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-3">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Extension Launchpad</p>
          <h1 className="text-3xl font-semibold">Public Marketplace</h1>
          <p className="max-w-2xl text-muted-foreground">
            Official and community extensions install into your workspace with scoped API access.
            Billing and webhook entitlements are enforced at the controller layer.
          </p>
          <Link href="/workspace/inbox" className="text-sm text-primary hover:underline">
            Back to workspace
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 py-8 md:grid-cols-2 lg:grid-cols-3">
        {extensions.map((extension) => (
          <article
            key={extension.id}
            className="flex flex-col rounded-lg border border-border bg-card p-5 shadow-sm"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-lg font-medium">{extension.name}</h2>
              {extension.is_official ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  Official
                </span>
              ) : null}
            </div>
            <p className="mb-4 flex-1 text-sm text-muted-foreground">{extension.description}</p>
            <div className="mt-auto space-y-2 text-xs text-muted-foreground">
              <p>Publisher: {extension.publisher ?? 'Community'}</p>
              <p>Slug: {extension.slug}</p>
            </div>
            <Link
              href={`/workspace?install=${encodeURIComponent(extension.slug)}`}
              className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Install in workspace
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
