/**
 * Credential cryptography primitives (Web Crypto — available in Workers).
 * - High-entropy secrets are hashed with SHA-256 (+ optional HMAC pepper), NOT bcrypt/Argon2
 *   (256-bit inputs are not brute-forceable; fast deterministic hash enables indexed lookup).
 * - All comparisons are constant-time to avoid timing oracles.
 */

const encoder = new TextEncoder();

/** URL-safe base64 (no padding). */
export function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < view.length; i += 1) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

/** N cryptographically-random bytes, URL-safe base64 encoded. */
export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/** SHA-256 hex digest. */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return toHex(digest);
}

/** HMAC-SHA256 hex digest (used when a server-side pepper is configured). */
export async function hmacSha256Hex(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return toHex(signature);
}

/**
 * Hash a credential. Uses HMAC-SHA256 with the pepper when present, else plain SHA-256.
 * The stored hash is opaque to which mode was used because verification re-derives with
 * the same pepper state.
 */
export async function hashSecret(value: string, pepper?: string): Promise<string> {
  return pepper ? hmacSha256Hex(value, pepper) : sha256Hex(value);
}

/** Constant-time string comparison (both must be same length hex/ascii). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** RFC 7636 PKCE S256 verification: SHA256(verifier) base64url === challenge. */
export async function verifyPkceS256(verifier: string, challenge: string): Promise<boolean> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(verifier));
  const computed = base64UrlEncode(digest);
  return timingSafeEqual(computed, challenge);
}

function toHex(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < view.length; i += 1) {
    hex += view[i].toString(16).padStart(2, '0');
  }
  return hex;
}
