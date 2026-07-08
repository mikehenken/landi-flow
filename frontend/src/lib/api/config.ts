/** Re-export mock-auth gate used by hydrator and controllers. */
export { isMockAuthEnabled } from '@/lib/agents/roster-client';

/** Same-origin proxy base — Next.js route forwards to Workers API with session bearer. */
export const API_V1_BASE = '/api/v1';

export function getApiProxyConfigured(): boolean {
  return Boolean(
    process.env.FLOW_API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      process.env.NEXT_PUBLIC_SITE_URL,
  );
}
