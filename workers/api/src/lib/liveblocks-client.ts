import { Liveblocks } from '@liveblocks/node';
import type { ApiWorkerEnv } from '../middleware/auth.js';

let cachedClient: Liveblocks | null = null;

export function getLiveblocksClient(env: ApiWorkerEnv): Liveblocks | null {
  const secret = env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = new Liveblocks({ secret });
  }
  return cachedClient;
}

export function resetLiveblocksClientForTests(): void {
  cachedClient = null;
}
