-- STUDY-013 task-09l — Agent identity + native runtime metadata.
-- Agents = governed workspace identity + attribution, NOT remote cloud runtimes.
-- Extends agents with runtime/vendor/connection_state; seeds built-in Landi Flow Agent
-- per workspace; updates list_assignable_members roster shape.

-- ---------------------------------------------------------------------------
-- 1. Runtime metadata enums + columns
-- ---------------------------------------------------------------------------
CREATE TYPE linear_clone.agent_runtime AS ENUM (
  'native',
  'external_mcp',
  'attribution_only'
);

CREATE TYPE linear_clone.agent_connection_state AS ENUM (
  'connected',
  'disconnected',
  'never_connected'
);

ALTER TABLE linear_clone.agents
  ADD COLUMN IF NOT EXISTS runtime linear_clone.agent_runtime NOT NULL DEFAULT 'external_mcp',
  ADD COLUMN IF NOT EXISTS vendor text,
  ADD COLUMN IF NOT EXISTS connection_state linear_clone.agent_connection_state NOT NULL DEFAULT 'never_connected',
  ADD COLUMN IF NOT EXISTS is_builtin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS capabilities text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN linear_clone.agents.runtime IS
  'task-09l: native (in-app Agent Console), external_mcp (IDE OAuth), attribution_only (post-hoc delegate).';
COMMENT ON COLUMN linear_clone.agents.vendor IS
  'task-09l: vendor label — Landi Flow, Cursor, Claude Code, custom.';
COMMENT ON COLUMN linear_clone.agents.connection_state IS
  'task-09l: MCP connection state for external agents; native builtin is always connected.';
COMMENT ON COLUMN linear_clone.agents.is_builtin IS
  'task-09l: true for the per-workspace Landi Flow Agent (no OAuth required).';
COMMENT ON COLUMN linear_clone.agents.capabilities IS
  'task-09l: capability tags surfaced in roster (inbox_triage, story_draft, …).';

CREATE UNIQUE INDEX IF NOT EXISTS agents_one_builtin_per_workspace_idx
  ON linear_clone.agents (workspace_id)
  WHERE is_builtin = true;

-- Backfill existing MCP-provisioned agents.
UPDATE linear_clone.agents
SET
  runtime = 'external_mcp',
  vendor = COALESCE(vendor, display_name),
  connection_state = CASE
    WHEN mcp_enabled THEN 'connected'::linear_clone.agent_connection_state
    ELSE 'disconnected'::linear_clone.agent_connection_state
  END,
  is_builtin = false
WHERE is_builtin = false;

-- ---------------------------------------------------------------------------
-- 2. Deterministic built-in agent id (stable per workspace)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION linear_clone_internal.builtin_agent_id(p_workspace_id uuid)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'landi-flow:builtin-agent:' || p_workspace_id::text
  );
$$;

REVOKE ALL ON FUNCTION linear_clone_internal.builtin_agent_id FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone_internal.builtin_agent_id TO service_role;

-- ---------------------------------------------------------------------------
-- 3. ensure_builtin_landi_flow_agent — one native agent per workspace
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION linear_clone_internal.ensure_builtin_landi_flow_agent(
  p_workspace_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_agent linear_clone.agents%ROWTYPE;
  v_agent_id uuid := linear_clone_internal.builtin_agent_id(p_workspace_id);
  v_installed_by uuid;
BEGIN
  v_installed_by := (
    SELECT wm.user_id
    FROM linear_clone.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.role = 'owner'
      AND wm.status = 'active'
    ORDER BY wm.joined_at NULLS LAST
    LIMIT 1
  );
  IF v_installed_by IS NULL THEN
    v_installed_by := (
      SELECT wm.user_id
      FROM linear_clone.workspace_members wm
      WHERE wm.workspace_id = p_workspace_id
        AND wm.status = 'active'
      ORDER BY wm.joined_at NULLS LAST
      LIMIT 1
    );
  END IF;
  IF v_installed_by IS NULL THEN
    RAISE EXCEPTION 'cannot provision builtin agent: no workspace member for %', p_workspace_id;
  END IF;

  INSERT INTO linear_clone.agents (
    id, workspace_id, app_user_id, display_name, icon_url,
    mentionable, assignable, billable, mcp_enabled, installed_by,
    runtime, vendor, connection_state, is_builtin, capabilities,
    settings
  ) VALUES (
    v_agent_id,
    p_workspace_id,
    gen_random_uuid(),
    'Landi Flow Agent',
    NULL,
    true, true, false, false,
    v_installed_by,
    'native'::linear_clone.agent_runtime,
    'Landi Flow',
    'connected'::linear_clone.agent_connection_state,
    true,
    ARRAY['inbox_triage', 'story_draft', 'epic_summary', 'agent_console'],
    jsonb_build_object('focus', 'Watching the Inbox for untriaged Stories')
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    runtime = EXCLUDED.runtime,
    vendor = EXCLUDED.vendor,
    connection_state = EXCLUDED.connection_state,
    is_builtin = EXCLUDED.is_builtin,
    capabilities = EXCLUDED.capabilities,
    assignable = true,
    mentionable = true,
    mcp_enabled = false,
    settings = linear_clone.agents.settings || EXCLUDED.settings,
    updated_at = now()
  RETURNING * INTO v_agent;

  RETURN to_jsonb(v_agent);
END;
$$;

REVOKE ALL ON FUNCTION linear_clone_internal.ensure_builtin_landi_flow_agent FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone_internal.ensure_builtin_landi_flow_agent TO service_role;

CREATE OR REPLACE FUNCTION linear_clone.ensure_builtin_landi_flow_agent(
  p_workspace_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT linear_clone_internal.ensure_builtin_landi_flow_agent(p_workspace_id);
$$;

REVOKE ALL ON FUNCTION linear_clone.ensure_builtin_landi_flow_agent FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone.ensure_builtin_landi_flow_agent TO service_role;

COMMENT ON FUNCTION linear_clone.ensure_builtin_landi_flow_agent IS
  'task-09l: idempotent provision of the per-workspace Landi Flow Agent (native runtime).';

-- Trigger: new workspaces always get the built-in agent.
CREATE OR REPLACE FUNCTION linear_clone_internal.on_workspace_created_ensure_builtin_agent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  PERFORM linear_clone_internal.ensure_builtin_landi_flow_agent(NEW.id);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Workspace may be created before any member exists (bootstrap flows).
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workspaces_ensure_builtin_agent ON linear_clone.workspaces;
CREATE TRIGGER workspaces_ensure_builtin_agent
  AFTER INSERT ON linear_clone.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION linear_clone_internal.on_workspace_created_ensure_builtin_agent();

-- Seed existing workspaces (dev / staging backfill).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT w.id
    FROM linear_clone.workspaces w
    WHERE w.deleted_at IS NULL
  LOOP
    BEGIN
      PERFORM linear_clone_internal.ensure_builtin_landi_flow_agent(r.id);
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4. ensure_mcp_agent — tag external MCP runtime metadata on provision
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION linear_clone_internal.ensure_mcp_agent(
  p_workspace_id uuid,
  p_installed_by uuid,
  p_display_name text,
  p_icon_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_agent linear_clone.agents%ROWTYPE;
  v_installed_by uuid;
  v_vendor text;
BEGIN
  v_installed_by := COALESCE(
    p_installed_by,
    (SELECT wm.user_id FROM linear_clone.workspace_members wm
       WHERE wm.workspace_id = p_workspace_id AND wm.role = 'owner'
       ORDER BY wm.joined_at NULLS LAST
       LIMIT 1)
  );
  IF v_installed_by IS NULL THEN
    RAISE EXCEPTION 'cannot provision agent: no installer and no workspace owner for %', p_workspace_id;
  END IF;

  v_vendor := COALESCE(
    NULLIF(trim(p_display_name), ''),
    'Custom MCP Agent'
  );

  INSERT INTO linear_clone.agents (
    workspace_id, app_user_id, display_name, icon_url,
    mentionable, assignable, billable, mcp_enabled, installed_by,
    runtime, vendor, connection_state, is_builtin, capabilities
  ) VALUES (
    p_workspace_id, gen_random_uuid(), p_display_name, p_icon_url,
    true, true, false, true, v_installed_by,
    'external_mcp'::linear_clone.agent_runtime,
    v_vendor,
    'connected'::linear_clone.agent_connection_state,
    false,
    ARRAY['mcp_tools', 'ide_session']
  )
  RETURNING * INTO v_agent;
  RETURN to_jsonb(v_agent);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. list_assignable_members — include runtime metadata in roster JSON
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION linear_clone_internal.list_assignable_members(
  p_workspace_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(jsonb_agg(m ORDER BY m->>'kind' DESC, m->>'is_builtin' DESC, m->>'name'), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'kind', 'human',
      'id', wm.user_id,
      'name', COALESCE(p.display_name, 'Member'),
      'avatar_url', p.avatar_url,
      'assignable', true,
      'mentionable', true,
      'presence', 'offline',
      'subtitle', wm.role::text,
      'runtime', NULL,
      'vendor', NULL,
      'connection_state', NULL,
      'is_builtin', false,
      'capabilities', '[]'::jsonb
    ) AS m
    FROM linear_clone.workspace_members wm
    LEFT JOIN linear_clone.profiles p ON p.user_id = wm.user_id
    WHERE wm.workspace_id = p_workspace_id
      AND wm.status = 'active'

    UNION ALL

    SELECT jsonb_build_object(
      'kind', 'agent',
      'id', a.id,
      'name', a.display_name,
      'avatar_url', a.icon_url,
      'assignable', a.assignable,
      'mentionable', a.mentionable,
      'presence', CASE
        WHEN a.runtime = 'native'::linear_clone.agent_runtime THEN 'idle'
        WHEN a.runtime = 'attribution_only'::linear_clone.agent_runtime THEN 'offline'
        WHEN a.connection_state = 'connected'::linear_clone.agent_connection_state THEN 'online'
        ELSE 'offline'
      END,
      'subtitle', COALESCE(a.vendor, 'Agent'),
      'runtime', a.runtime::text,
      'vendor', a.vendor,
      'connection_state', a.connection_state::text,
      'is_builtin', a.is_builtin,
      'capabilities', to_jsonb(a.capabilities),
      'developer_discrepancy', COALESCE((a.settings->>'developer_discrepancy')::boolean, false)
    ) AS m
    FROM linear_clone.agents a
    WHERE a.workspace_id = p_workspace_id
      AND a.assignable = true
  ) rows;
$$;

COMMENT ON FUNCTION linear_clone.list_assignable_members IS
  'task-09l: unified assignee roster with agent runtime/vendor/connection metadata.';
