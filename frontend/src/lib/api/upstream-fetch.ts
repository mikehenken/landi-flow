import { getCloudflareContext } from '@opennextjs/cloudflare';

/** Cloudflare service binding to `landi-flow-api` (see frontend/wrangler.toml). */
interface FlowApiServiceBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface FlowCloudflareEnv {
  FLOW_API?: FlowApiServiceBinding;
}

export function resolveFlowApiUpstreamBase(): string | null {
  const raw =
    process.env.FLOW_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) {
    return null;
  }
  return raw.replace(/\/$/, '');
}

/**
 * Forwards a request to the API Worker. Prefers the `FLOW_API` service binding on
 * Cloudflare Workers (avoids worker-to-worker HTTP 530); falls back to FLOW_API_URL
 * for local `next dev` and tests.
 */
export async function fetchFlowApiUpstream(
  upstreamPath: string,
  init: RequestInit,
): Promise<Response> {
  const normalizedPath = upstreamPath.startsWith('/') ? upstreamPath : `/${upstreamPath}`;

  try {
    const { env } = await getCloudflareContext({ async: true });
    const flowApiBinding = (env as FlowCloudflareEnv).FLOW_API;
    if (flowApiBinding) {
      // Hostname is a placeholder — routing uses the service binding, not DNS.
      const bindingUrl = `https://flow-api.internal${normalizedPath}`;
      return flowApiBinding.fetch(bindingUrl, init);
    }
  } catch {
    // Outside Cloudflare Workers (unit tests, etc.) — use HTTP fallback below.
  }

  const upstreamBase = resolveFlowApiUpstreamBase();
  if (!upstreamBase) {
    throw new Error('FLOW_API_URL is not configured');
  }

  return fetch(`${upstreamBase}${normalizedPath}`, init);
}
