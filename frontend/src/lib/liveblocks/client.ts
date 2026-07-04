import { createClient } from '@liveblocks/client';
import { createCorrelationContext } from '@/lib/correlation';
import { isLiveblocksConfigured } from './config';

let cachedClient: ReturnType<typeof createClient> | null = null;

/** Singleton Liveblocks client (authEndpoint-only); null when not configured. */
export function getLiveblocksClient(): ReturnType<typeof createClient> | null {
  if (!isLiveblocksConfigured()) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient({
      authEndpoint: async (room?: string) => {
        const { correlation_id } = createCorrelationContext();
        const response = await fetch('/api/liveblocks-auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Landi-Correlation-Id': correlation_id,
          },
          body: JSON.stringify({ room }),
        });
        return response.json() as Promise<{ token: string }>;
      },
    });
  }

  return cachedClient;
}

export { isLiveblocksConfigured };
