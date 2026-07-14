import { createClient } from '@liveblocks/client';
import { fetchLiveblocksAuthToken } from './auth-endpoint';
import { isLiveblocksConfigured } from './config';

let cachedClient: ReturnType<typeof createClient> | null = null;

/** Singleton Liveblocks client (authEndpoint-only); null when not configured. */
export function getLiveblocksClient(): ReturnType<typeof createClient> | null {
  if (!isLiveblocksConfigured()) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient({
      authEndpoint: fetchLiveblocksAuthToken,
    });
  }

  return cachedClient;
}

export { isLiveblocksConfigured };
