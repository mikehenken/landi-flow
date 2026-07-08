import { createCorrelationContext } from '@/lib/correlation';

interface LiveblocksAuthErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload
  ) {
    const errorBody = payload as LiveblocksAuthErrorBody;
    const message = errorBody.error?.message;
    const code = errorBody.error?.code;
    if (message && code) {
      return `${message} (${code})`;
    }
    if (message) {
      return message;
    }
    if (code) {
      return code;
    }
  }

  return `Liveblocks auth failed (${status}): response did not include a token`;
}

/**
 * Client-side auth callback for LiveblocksProvider / createClient.
 * Must resolve to `{ token: string }` per @liveblocks/client contract.
 */
export async function fetchLiveblocksAuthToken(
  room?: string
): Promise<{ token: string }> {
  const { correlation_id } = createCorrelationContext();
  const response = await fetch('/api/liveblocks-auth', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-Landi-Correlation-Id': correlation_id,
    },
    body: JSON.stringify({ room }),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      `Liveblocks auth failed (${response.status}): invalid JSON response`
    );
  }

  if (
    typeof payload === 'object' &&
    payload !== null &&
    'token' in payload &&
    typeof (payload as { token: unknown }).token === 'string' &&
    (payload as { token: string }).token.length > 0
  ) {
    return { token: (payload as { token: string }).token };
  }

  throw new Error(extractErrorMessage(payload, response.status));
}
