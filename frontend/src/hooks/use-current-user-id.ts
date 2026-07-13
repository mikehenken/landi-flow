'use client';

import { CURRENT_USER } from '@/lib/agent-roster';
import { isMockAuthEnabled } from '@/lib/api/config';
import { useSupabaseSession } from '@/lib/supabase/session-provider';

/**
 * Authenticated session user id for My Issues / personal filters.
 * Mock auth falls back to the demo CURRENT_USER when no session exists.
 */
export function useCurrentUserId(): string | null {
  const { user } = useSupabaseSession();
  if (user?.id) {
    return user.id;
  }
  if (isMockAuthEnabled()) {
    return CURRENT_USER.id;
  }
  return null;
}
