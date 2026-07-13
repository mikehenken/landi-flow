import { getBearerTokenFromRequest } from '@landi-flow/auth/jwt';

/** Whether the authorize request should redirect to the browser consent page. */
export function shouldRedirectToOAuthConsent(input: {
  bearerPresent: boolean;
  workspaceId: string | null;
  consentPageUrl: string | null;
}): boolean {
  if (!input.consentPageUrl) {
    return false;
  }
  return !input.bearerPresent || !input.workspaceId;
}

export function bearerPresentOnRequest(request: Request): boolean {
  return getBearerTokenFromRequest(request) !== null;
}

/** 302 to the web consent UI preserving OAuth query parameters. */
export function buildConsentRedirectResponse(
  consentPageUrl: string,
  searchParams: URLSearchParams,
): Response {
  const location = new URL(consentPageUrl);
  for (const [key, value] of searchParams.entries()) {
    if (key !== 'workspace_id' || value.trim().length > 0) {
      location.searchParams.set(key, value);
    }
  }
  return new Response(null, {
    status: 302,
    headers: { Location: location.toString() },
  });
}
