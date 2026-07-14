import type { DbClient } from './db.js';
import { clientIp } from './http.js';

export type CredentialAuditEvent =
  | 'issued'
  | 'used'
  | 'denied'
  | 'rotated'
  | 'revoked'
  | 'registered'
  | 'authorized'
  | 'token_issued'
  | 'token_refreshed'
  | 'token_refresh_reuse';

export interface AuditInput {
  workspaceId?: string | null;
  credentialId?: string | null;
  actorId?: string | null;
  event: CredentialAuditEvent;
  credentialKind?: string | null;
  request?: Request;
  detail?: Record<string, unknown>;
}

/**
 * Append to the immutable credential_audit trail. Never throws into the caller
 * path — audit failures must not break auth — and NEVER records secret values.
 */
export async function recordCredentialAudit(db: DbClient, input: AuditInput): Promise<void> {
  try {
    await db.from('credential_audit').insert({
      workspace_id: input.workspaceId ?? null,
      credential_id: input.credentialId ?? null,
      actor_id: input.actorId ?? null,
      event: input.event,
      credential_kind: input.credentialKind ?? null,
      ip: input.request ? clientIp(input.request) : null,
      user_agent: input.request?.headers.get('User-Agent') ?? null,
      detail: input.detail ?? {},
    });
  } catch {
    // Intentionally swallow — auditing is best-effort and must not block auth.
  }
}
