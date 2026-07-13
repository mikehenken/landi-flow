import type { Workspace } from '@landi-flow/core/types';
import {
  parseWorkspaceSettings,
  type WorkspaceSettings,
  type WorkspaceThemeSettings,
} from '@landi-flow/core/types';
import { DEMO_WORKSPACE_ID } from '@/lib/seed-data';
import { isWorkspaceUuid } from '@/lib/workspace/is-workspace-uuid';

/** Resolved workspace record with parsed settings for frontend theming/i18n. */
export interface ResolvedWorkspace extends Workspace {
  parsedSettings: WorkspaceSettings;
}

const NOW = '2026-07-04T12:00:00.000Z';

/** Demo registry — mirrors multi-tenant Workspaces model with white-label variants. */
export const WORKSPACE_REGISTRY: ResolvedWorkspace[] = [
  {
    id: DEMO_WORKSPACE_ID,
    slug: 'landi-flow',
    name: 'Landi Flow',
    icon_url: '/assets/brand/logo-mark.png',
    settings: {},
    parsedSettings: {},
    created_at: NOW,
    updated_at: NOW,
    deleted_at: null,
  },
  {
    id: 'ws-acme-agency',
    slug: 'acme-agency',
    name: 'Acme Agency',
    icon_url: null,
    settings: {
      theme: {
        brand_primary: '142 76% 36%',
        surface: '140 8% 12%',
        logo_url: '/assets/brand/logo-mark.png',
        font_family_heading: '"Geist", sans-serif',
        font_google_family: 'Geist',
      },
      custom_domains: ['tracker.acme.test', 'acme.localhost'],
      terminology: {
        story: 'Task',
        stories: 'Tasks',
        epic: 'Initiative',
        epics: 'Initiatives',
        workspace: 'Organization',
      },
    },
    parsedSettings: parseWorkspaceSettings({
      theme: {
        brand_primary: '142 76% 36%',
        surface: '140 8% 12%',
        logo_url: '/assets/brand/logo-mark.png',
        font_family_heading: '"Geist", sans-serif',
        font_google_family: 'Geist',
      },
      custom_domains: ['tracker.acme.test', 'acme.localhost'],
      terminology: {
        story: 'Task',
        stories: 'Tasks',
        epic: 'Initiative',
        epics: 'Initiatives',
        workspace: 'Organization',
      },
    }),
    created_at: NOW,
    updated_at: NOW,
    deleted_at: null,
  },
  {
    id: 'ws-rtl-demo',
    slug: 'rtl-demo',
    name: 'RTL Demo Workspace',
    icon_url: null,
    settings: {
      theme: {
        brand_primary: '262 83% 58%',
        surface: '260 10% 12%',
      },
      default_locale: 'ar',
      custom_domains: ['rtl.localhost'],
    },
    parsedSettings: parseWorkspaceSettings({
      theme: {
        brand_primary: '262 83% 58%',
        surface: '260 10% 12%',
      },
      default_locale: 'ar',
      custom_domains: ['rtl.localhost'],
    }),
    created_at: NOW,
    updated_at: NOW,
    deleted_at: null,
  },
];

const DOMAIN_INDEX: Map<string, string> = new Map();

for (const workspace of WORKSPACE_REGISTRY) {
  const domains = workspace.parsedSettings.custom_domains ?? [];
  for (const domain of domains) {
    DOMAIN_INDEX.set(domain.toLowerCase(), workspace.id);
  }
}

/** Hostname without port, lowercased. */
export function normalizeHostname(hostHeader: string | null | undefined): string {
  if (!hostHeader) {
    return 'localhost';
  }
  return hostHeader.split(':')[0]?.toLowerCase() ?? 'localhost';
}

export function getWorkspaceById(workspaceId: string): ResolvedWorkspace | undefined {
  return WORKSPACE_REGISTRY.find((ws) => ws.id === workspaceId);
}

export function getWorkspaceBySlug(slug: string): ResolvedWorkspace | undefined {
  return WORKSPACE_REGISTRY.find((ws) => ws.slug === slug);
}

/** Host-derived workspace id for mock-auth / white-label domains only. */
export function resolveWorkspaceIdFromHost(hostHeader: string | null | undefined): string {
  const hostname = normalizeHostname(hostHeader);
  return DOMAIN_INDEX.get(hostname) ?? DEMO_WORKSPACE_ID;
}

/**
 * Placeholder workspace for a resolved Postgres UUID before the client loads
 * membership details from the Workers API. Never use demo seed ids here.
 */
export function buildPlaceholderWorkspace(workspaceId: string): ResolvedWorkspace {
  const now = new Date().toISOString();
  return {
    id: workspaceId,
    slug: workspaceId,
    name: 'Workspace',
    icon_url: null,
    settings: {},
    parsedSettings: {},
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}

/**
 * SSR/bootstrap workspace: registry hit for demo hosts, placeholder for real UUIDs,
 * demo registry entry only for non-UUID host ids (mock-auth / local dev).
 */
export function resolveInitialWorkspace(workspaceId: string): ResolvedWorkspace {
  const registryHit = getWorkspaceById(workspaceId);
  if (registryHit) {
    return registryHit;
  }
  if (isWorkspaceUuid(workspaceId)) {
    return buildPlaceholderWorkspace(workspaceId);
  }
  return WORKSPACE_REGISTRY[0]!;
}

export function resolveWorkspaceFromHost(
  hostHeader: string | null | undefined,
): ResolvedWorkspace {
  const id = resolveWorkspaceIdFromHost(hostHeader);
  return resolveInitialWorkspace(id);
}

export function getWorkspaceTheme(
  workspace: ResolvedWorkspace,
): WorkspaceThemeSettings | undefined {
  return workspace.parsedSettings.theme;
}

export function getWorkspaceLogoUrl(workspace: ResolvedWorkspace): string | undefined {
  return (
    workspace.parsedSettings.theme?.logo_url ??
    workspace.icon_url ??
    undefined
  );
}
