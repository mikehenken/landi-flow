/** HMAC-SHA256 webhook signing (Landi outbound delivery contract). */
export async function signWebhookPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(payload));
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  return btoa(String.fromCharCode(...signatureArray));
}
