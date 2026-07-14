/** Liveblocks configuration — keys referenced by NAME only per STUDY-013 secrets policy. */

import {
  buildEpicRoomId,
  buildStoryRoomId,
  buildBoardRoomId,
  buildWorkspaceLobbyRoomId,
  parseRoomId,
  isPresenceOnlyRoom,
} from '@landi-flow/collaboration';

export {
  buildEpicRoomId,
  buildStoryRoomId,
  buildBoardRoomId,
  buildWorkspaceLobbyRoomId,
  parseRoomId,
  isPresenceOnlyRoom,
};

export function getLiveblocksPublicKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
  if (!key || key.trim().length === 0) {
    return undefined;
  }
  const trimmed = key.trim();
  // Secret keys (sk_*) must never be exposed via NEXT_PUBLIC_* — treat as misconfigured.
  if (trimmed.startsWith('sk_')) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[liveblocks] NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY looks like a secret key (sk_*). Set pk_* here and LIVEBLOCKS_SECRET_KEY server-side.'
      );
    }
    return undefined;
  }
  return trimmed;
}

export function isLiveblocksConfigured(): boolean {
  return Boolean(getLiveblocksPublicKey());
}

/**
 * Whether the Liveblocks SDK "Powered by" vendor badge may render.
 * Hidden on production (flow.landi.build) for copy-hygiene GATE 1; opt-in via env for local QA.
 */
export function isLiveblocksVendorBadgeVisible(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.NEXT_PUBLIC_LIVEBLOCKS_SHOW_VENDOR_BADGE === '1') {
    return true;
  }
  if (env.NEXT_PUBLIC_LIVEBLOCKS_SHOW_VENDOR_BADGE === '0') {
    return false;
  }
  return env.NODE_ENV === 'development';
}

export interface LiveblocksEnvStatus {
  publicKeyConfigured: boolean;
  secretKeyConfigured: boolean;
  ready: boolean;
  reason: string | null;
}

/** Server-side readiness check (public + secret keys). Never logs values. */
export function getLiveblocksEnvStatus(
  env: NodeJS.ProcessEnv = process.env
): LiveblocksEnvStatus {
  const publicKeyConfigured = Boolean(getLiveblocksPublicKeyFromEnv(env));
  const secretKeyConfigured = Boolean(env.LIVEBLOCKS_SECRET_KEY?.trim());
  if (!publicKeyConfigured && !secretKeyConfigured) {
    return {
      publicKeyConfigured,
      secretKeyConfigured,
      ready: false,
      reason: 'Set NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY (pk_*) and LIVEBLOCKS_SECRET_KEY (sk_*)',
    };
  }
  if (!publicKeyConfigured) {
    return {
      publicKeyConfigured,
      secretKeyConfigured,
      ready: false,
      reason: 'NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY (pk_*) is missing or misconfigured (sk_* rejected)',
    };
  }
  if (!secretKeyConfigured) {
    return {
      publicKeyConfigured,
      secretKeyConfigured,
      ready: false,
      reason: 'LIVEBLOCKS_SECRET_KEY (sk_*) is missing on the Next.js server',
    };
  }
  return {
    publicKeyConfigured,
    secretKeyConfigured,
    ready: true,
    reason: null,
  };
}

function getLiveblocksPublicKeyFromEnv(env: NodeJS.ProcessEnv): string | undefined {
  const key = env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
  if (!key || key.trim().length === 0) {
    return undefined;
  }
  const trimmed = key.trim();
  if (trimmed.startsWith('sk_')) {
    return undefined;
  }
  return trimmed;
}

export function buildEntityRoomId(
  workspaceId: string,
  entityType: 'epic' | 'story',
  entityId: string
): string {
  return entityType === 'story'
    ? buildStoryRoomId(workspaceId, entityId)
    : buildEpicRoomId(workspaceId, entityId);
}
