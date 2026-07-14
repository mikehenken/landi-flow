/** OAuth authorization request parameters for MCP consent (RFC 6749 + PKCE + RFC 8707). */
export interface McpOAuthAuthorizeParams {
  response_type: 'code';
  client_id: string;
  redirect_uri: string | null;
  code_challenge: string;
  code_challenge_method: string;
  state: string | null;
  scope: string | null;
  resource: string | null;
}

export type ParseMcpOAuthParamsResult =
  | { ok: true; params: McpOAuthAuthorizeParams }
  | { ok: false; error: string };

const REQUIRED_KEYS = ['response_type', 'client_id', 'code_challenge'] as const;

/** Parse and validate OAuth params from a consent page query string. */
export function parseMcpOAuthParams(
  input: Record<string, string | string[] | undefined>,
): ParseMcpOAuthParamsResult {
  const read = (key: string): string | null => {
    const raw = input[key];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw.trim();
    }
    if (Array.isArray(raw) && typeof raw[0] === 'string' && raw[0].trim().length > 0) {
      return raw[0].trim();
    }
    return null;
  };

  for (const key of REQUIRED_KEYS) {
    if (!read(key)) {
      return { ok: false, error: `Missing required parameter: ${key}` };
    }
  }

  const responseType = read('response_type');
  if (responseType !== 'code') {
    return { ok: false, error: 'Only response_type=code is supported' };
  }

  const codeChallengeMethod = read('code_challenge_method') ?? 'S256';
  if (codeChallengeMethod !== 'S256') {
    return { ok: false, error: 'code_challenge_method must be S256' };
  }

  return {
    ok: true,
    params: {
      response_type: 'code',
      client_id: read('client_id')!,
      redirect_uri: read('redirect_uri'),
      code_challenge: read('code_challenge')!,
      code_challenge_method: codeChallengeMethod,
      state: read('state'),
      scope: read('scope'),
      resource: read('resource'),
    },
  };
}

/** Serialize OAuth params for forwarding to the authorize proxy. */
export function serializeMcpOAuthParams(
  params: McpOAuthAuthorizeParams,
  workspaceId: string,
): string {
  const search = new URLSearchParams();
  search.set('response_type', params.response_type);
  search.set('client_id', params.client_id);
  search.set('code_challenge', params.code_challenge);
  search.set('code_challenge_method', params.code_challenge_method);
  if (workspaceId.trim().length > 0) {
    search.set('workspace_id', workspaceId);
  }
  if (params.redirect_uri) {
    search.set('redirect_uri', params.redirect_uri);
  }
  if (params.state) {
    search.set('state', params.state);
  }
  if (params.scope) {
    search.set('scope', params.scope);
  }
  if (params.resource) {
    search.set('resource', params.resource);
  }
  return search.toString();
}

/** Build a consent return path (without locale) for post-login redirect. */
export function buildMcpConsentReturnPath(params: McpOAuthAuthorizeParams): string {
  return `/oauth/mcp/consent?${serializeMcpOAuthParams(params, '')}`;
}

const MCP_SCOPE_LABELS: Record<string, string> = {
  read: 'Read workspace data',
  write: 'Write workspace data',
  'stories:create': 'Create stories',
  'stories:write': 'Update stories',
  'epics:create': 'Create epics',
  'epics:write': 'Update epics',
  'comments:create': 'Create comments',
  'signals:write': 'Attach signals',
  'app:assignable': 'Allow assignment as an app',
  'app:mentionable': 'Allow @mentions as an app',
};

/** Human-readable scope summary for the consent UI. */
export function describeMcpOAuthScopes(scope: string | null): string[] {
  if (!scope || scope.trim().length === 0) {
    return ['Read workspace data (default)'];
  }
  const parts = scope.split(/\s+/).filter(Boolean);
  const labels = parts.map((part) => MCP_SCOPE_LABELS[part] ?? part);
  return labels.length > 0 ? labels : ['Read workspace data (default)'];
}

/** Redirect URI for OAuth access_denied (RFC 6749 §4.1.2.1). */
export function buildOAuthAccessDeniedRedirect(
  redirectUri: string,
  state: string | null,
): string {
  const location = new URL(redirectUri);
  location.searchParams.set('error', 'access_denied');
  location.searchParams.set('error_description', 'The resource owner denied the request');
  if (state) {
    location.searchParams.set('state', state);
  }
  return location.toString();
}
