-- STUDY-013 task-09d — MCP credential plane (IDEA-007 MCP Credential Vault).
-- User-issued, scoped, revocable, audited credentials that AI agents / external IDE
-- clients present to the MCP server + REST API. Secrets are stored hash-only
-- (prefix + SHA-256/HMAC); reversible OAuth client secrets are hashed for verification.
-- All rows are service-tier only: the MCP Worker (service_role) is the sole writer,
-- so these tables are REVOKED from `authenticated` and forced-RLS-denied (defense in depth).

-- Credential kind: api_key (personal), oauth_token (user access token),
-- app_token (client_credentials actor=app), dcr_client (RFC 7591 registration).
CREATE TYPE linear_clone.mcp_credential_kind AS ENUM (
  'api_key', 'oauth_token', 'app_token', 'dcr_client'
);

CREATE TYPE linear_clone.oauth_actor_type AS ENUM ('user', 'app');

-- ---------------------------------------------------------------------------
-- Personal API keys + long-lived credentials (types 1 & 4 storage row)
-- ---------------------------------------------------------------------------
CREATE TABLE linear_clone.mcp_credentials (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id        uuid REFERENCES linear_clone.agents(id) ON DELETE SET NULL,
  kind            linear_clone.mcp_credential_kind NOT NULL DEFAULT 'api_key',
  name            text NOT NULL,
  key_prefix      text NOT NULL UNIQUE,
  key_hash        text NOT NULL,
  scopes          text[] NOT NULL DEFAULT '{}',
  readonly        boolean NOT NULL DEFAULT false,
  resource_uri    text,
  expires_at      timestamptz,
  last_used_at    timestamptz,
  rotated_from    uuid REFERENCES linear_clone.mcp_credentials(id) ON DELETE SET NULL,
  revoked_at      timestamptz,
  revoked_reason  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mcp_credentials_workspace_idx
  ON linear_clone.mcp_credentials (workspace_id, user_id)
  WHERE revoked_at IS NULL;

-- ---------------------------------------------------------------------------
-- OAuth 2.1 clients (RFC 7591 Dynamic Client Registration + admin-registered apps)
-- ---------------------------------------------------------------------------
CREATE TABLE linear_clone.oauth_clients (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id              uuid REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  client_id                 text NOT NULL UNIQUE,
  client_secret_hash        text,
  client_name               text NOT NULL,
  redirect_uris             text[] NOT NULL DEFAULT '{}',
  grant_types               text[] NOT NULL DEFAULT '{authorization_code,refresh_token}',
  response_types            text[] NOT NULL DEFAULT '{code}',
  token_endpoint_auth_method text NOT NULL DEFAULT 'none',
  scopes                    text[] NOT NULL DEFAULT '{}',
  is_public                 boolean NOT NULL DEFAULT true,
  dynamically_registered    boolean NOT NULL DEFAULT false,
  logo_uri                  text,
  created_by                uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  revoked_at                timestamptz
);

CREATE TRIGGER oauth_clients_updated_at
  BEFORE UPDATE ON linear_clone.oauth_clients
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

-- ---------------------------------------------------------------------------
-- Authorization codes (short-lived, PKCE-bound, single-use)
-- ---------------------------------------------------------------------------
CREATE TABLE linear_clone.oauth_authorization_codes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash             text NOT NULL UNIQUE,
  client_id             text NOT NULL,
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id          uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  redirect_uri          text NOT NULL,
  code_challenge        text NOT NULL,
  code_challenge_method text NOT NULL DEFAULT 'S256',
  scopes                text[] NOT NULL DEFAULT '{}',
  resource              text,
  expires_at            timestamptz NOT NULL,
  consumed_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX oauth_authorization_codes_expiry_idx
  ON linear_clone.oauth_authorization_codes (expires_at)
  WHERE consumed_at IS NULL;

-- ---------------------------------------------------------------------------
-- Issued tokens (opaque, DB-backed for instant revocation)
-- ---------------------------------------------------------------------------
CREATE TABLE linear_clone.oauth_tokens (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           text NOT NULL,
  user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id        uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  agent_id            uuid REFERENCES linear_clone.agents(id) ON DELETE SET NULL,
  actor_type          linear_clone.oauth_actor_type NOT NULL DEFAULT 'user',
  grant_type          text NOT NULL,
  scopes              text[] NOT NULL DEFAULT '{}',
  resource            text,
  readonly            boolean NOT NULL DEFAULT false,
  access_token_hash   text NOT NULL UNIQUE,
  refresh_token_hash  text UNIQUE,
  refresh_family_id   uuid,
  expires_at          timestamptz NOT NULL,
  refresh_expires_at  timestamptz,
  last_used_at        timestamptz,
  revoked_at          timestamptz,
  revoked_reason      text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX oauth_tokens_refresh_family_idx
  ON linear_clone.oauth_tokens (refresh_family_id)
  WHERE refresh_family_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Immutable credential audit trail (issued/used/denied/rotated/revoked)
-- ---------------------------------------------------------------------------
CREATE TABLE linear_clone.credential_audit (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  credential_id   uuid,
  actor_id        uuid,
  event           text NOT NULL,
  credential_kind text,
  ip              text,
  user_agent      text,
  detail          jsonb NOT NULL DEFAULT '{}'::jsonb,
  at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX credential_audit_workspace_idx
  ON linear_clone.credential_audit (workspace_id, at DESC);

-- ---------------------------------------------------------------------------
-- Row Level Security — enable + FORCE (AR-03), service-tier only.
-- No policies for `authenticated` == deny-all under FORCE RLS. All access flows
-- through the MCP Worker with the service_role key, mirroring agent_action_outbox.
-- ---------------------------------------------------------------------------
ALTER TABLE linear_clone.mcp_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.mcp_credentials FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.oauth_clients FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.oauth_authorization_codes FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.oauth_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.credential_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.credential_audit FORCE ROW LEVEL SECURITY;

-- Explicit deny policies (documented intent; FORCE RLS already denies without policy).
CREATE POLICY mcp_credentials_deny ON linear_clone.mcp_credentials
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY oauth_clients_deny ON linear_clone.oauth_clients
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY oauth_authorization_codes_deny ON linear_clone.oauth_authorization_codes
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY oauth_tokens_deny ON linear_clone.oauth_tokens
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY credential_audit_deny ON linear_clone.credential_audit
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Revoke Data API access from authenticated; service_role bypasses RLS + grants.
REVOKE ALL ON linear_clone.mcp_credentials FROM authenticated;
REVOKE ALL ON linear_clone.oauth_clients FROM authenticated;
REVOKE ALL ON linear_clone.oauth_authorization_codes FROM authenticated;
REVOKE ALL ON linear_clone.oauth_tokens FROM authenticated;
REVOKE ALL ON linear_clone.credential_audit FROM authenticated;

COMMENT ON TABLE linear_clone.mcp_credentials IS
  'IDEA-007 MCP Credential Vault: prefix + hash storage, scoped/revocable, service-tier only.';
COMMENT ON TABLE linear_clone.oauth_tokens IS
  'Opaque DB-backed OAuth 2.1 tokens for instant (RFC 7009) revocation + refresh reuse detection.';
