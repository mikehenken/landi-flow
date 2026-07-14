/**
 * Credential issuance + verification.
 *
 * Storage model: `prefix + hash` (never the raw secret). The raw key is shown
 * exactly once at issuance. Verification does an indexed prefix lookup then a
 * constant-time hash compare, followed by expiry + revocation checks. Errors are
 * intentionally uniform to avoid oracle leakage; secrets are never logged.
 */
import type { DbClient } from '../lib/db.js';
import { hashSecret, randomToken, timingSafeEqual } from '../lib/crypto.js';

const API_KEY_HUMAN_PREFIX = 'lcf_sk_';
const CLIENT_ID_PREFIX = 'lcf_client_';
const CLIENT_SECRET_PREFIX = 'lcf_cs_';
/** Number of leading characters stored (indexed) for O(1) candidate lookup. */
const STORED_PREFIX_LENGTH = 18;

export interface McpCredentialRow {
  id: string;
  workspace_id: string;
  user_id: string;
  agent_id: string | null;
  kind: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  scopes: string[];
  readonly: boolean;
  resource_uri: string | null;
  expires_at: string | null;
  last_used_at: string | null;
  rotated_from: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  created_at: string;
}

export interface IssueApiKeyInput {
  workspaceId: string;
  userId: string;
  agentId?: string | null;
  name: string;
  scopes: string[];
  readonly?: boolean;
  resourceUri?: string | null;
  expiresAt?: string | null;
  rotatedFrom?: string | null;
}

export interface IssuedApiKey {
  credential: Omit<McpCredentialRow, 'key_hash'>;
  /** Raw key — returned ONCE, never persisted. */
  plaintextKey: string;
}

export async function issueApiKey(
  db: DbClient,
  pepper: string | undefined,
  input: IssueApiKeyInput
): Promise<IssuedApiKey> {
  const secret = randomToken(32);
  const plaintextKey = `${API_KEY_HUMAN_PREFIX}${secret}`;
  const keyPrefix = plaintextKey.slice(0, STORED_PREFIX_LENGTH);
  const keyHash = await hashSecret(plaintextKey, pepper);

  const { data, error } = await db
    .from('mcp_credentials')
    .insert({
      workspace_id: input.workspaceId,
      user_id: input.userId,
      agent_id: input.agentId ?? null,
      kind: 'api_key',
      name: input.name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      scopes: input.scopes,
      readonly: input.readonly ?? false,
      resource_uri: input.resourceUri ?? null,
      expires_at: input.expiresAt ?? null,
      rotated_from: input.rotatedFrom ?? null,
    })
    .select(
      'id, workspace_id, user_id, agent_id, kind, name, key_prefix, scopes, readonly, resource_uri, expires_at, last_used_at, rotated_from, revoked_at, revoked_reason, created_at'
    )
    .single();

  if (error || !data) {
    throw new Error(`Failed to issue API key: ${error?.message ?? 'unknown error'}`);
  }

  return { credential: data as Omit<McpCredentialRow, 'key_hash'>, plaintextKey };
}

export type ApiKeyVerification =
  | { ok: true; credential: McpCredentialRow }
  | { ok: false; reason: 'not_found' | 'expired' | 'revoked' | 'invalid' };

/**
 * Verify a presented API key. Returns a discriminated result; callers must NOT
 * expose which specific reason failed to the client (uniform 401).
 */
export async function verifyApiKey(
  db: DbClient,
  pepper: string | undefined,
  presentedKey: string
): Promise<ApiKeyVerification> {
  if (!presentedKey.startsWith(API_KEY_HUMAN_PREFIX)) {
    return { ok: false, reason: 'invalid' };
  }
  const keyPrefix = presentedKey.slice(0, STORED_PREFIX_LENGTH);

  const { data, error } = await db
    .from('mcp_credentials')
    .select('*')
    .eq('key_prefix', keyPrefix)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: 'not_found' };
  }

  const row = data as McpCredentialRow;
  const presentedHash = await hashSecret(presentedKey, pepper);
  if (!timingSafeEqual(presentedHash, row.key_hash)) {
    return { ok: false, reason: 'invalid' };
  }
  if (row.revoked_at) {
    return { ok: false, reason: 'revoked' };
  }
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true, credential: row };
}

export async function touchCredentialLastUsed(db: DbClient, credentialId: string): Promise<void> {
  try {
    await db
      .from('mcp_credentials')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', credentialId);
  } catch {
    // best-effort
  }
}

export async function revokeApiKey(
  db: DbClient,
  credentialId: string,
  reason: string
): Promise<boolean> {
  const { data, error } = await db
    .from('mcp_credentials')
    .update({ revoked_at: new Date().toISOString(), revoked_reason: reason })
    .eq('id', credentialId)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to revoke credential: ${error.message}`);
  }
  return Boolean(data);
}

// ---------------------------------------------------------------------------
// OAuth client credentials
// ---------------------------------------------------------------------------

export interface GeneratedClientSecret {
  clientId: string;
  clientSecret: string;
  clientSecretHash: string;
}

export function generateClientId(): string {
  return `${CLIENT_ID_PREFIX}${randomToken(12)}`;
}

export async function generateClientSecret(
  pepper: string | undefined
): Promise<GeneratedClientSecret> {
  const clientId = generateClientId();
  const clientSecret = `${CLIENT_SECRET_PREFIX}${randomToken(32)}`;
  const clientSecretHash = await hashSecret(clientSecret, pepper);
  return { clientId, clientSecret, clientSecretHash };
}

export async function verifyClientSecret(
  pepper: string | undefined,
  presentedSecret: string,
  storedHash: string
): Promise<boolean> {
  const presentedHash = await hashSecret(presentedSecret, pepper);
  return timingSafeEqual(presentedHash, storedHash);
}
