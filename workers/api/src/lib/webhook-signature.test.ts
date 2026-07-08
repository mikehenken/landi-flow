import { describe, expect, it } from 'vitest';
import { signWebhookPayload } from './webhook-signature';

describe('signWebhookPayload', () => {
  it('produces deterministic HMAC-SHA256 base64 signatures', async () => {
    const payload = JSON.stringify({ topic: 'entity.story.created', id: 'evt-1' });
    const secret = 'whsec_test_signing_key';
    const sig1 = await signWebhookPayload(payload, secret);
    const sig2 = await signWebhookPayload(payload, secret);
    expect(sig1).toBe(sig2);
    expect(sig1.length).toBeGreaterThan(10);
  });

  it('differs for different secrets', async () => {
    const payload = '{"test":true}';
    const a = await signWebhookPayload(payload, 'secret-a');
    const b = await signWebhookPayload(payload, 'secret-b');
    expect(a).not.toBe(b);
  });
});
