-- STUDY-013 task-09d — Agent Action Bus mutation path for MCP tools.
-- Every MCP/agent write is recorded in agent_action_outbox (proposed) BEFORE any
-- entity DML (single-writer correctness + audit). Non-destructive writes auto-apply
-- atomically; destructive ones stay `proposed` for the Handoff Queue (human approve).
-- Entity ops delegate to the shared execute_mutation_with_outbox (0017) so agent + human
-- writes share one transactional-outbox code path. Comment/signal ops are handled inline.

CREATE OR REPLACE FUNCTION linear_clone_internal.execute_agent_mutation(
  p_op text,
  p_workspace_id uuid,
  p_topic text,
  p_payload jsonb,
  p_correlation_id uuid,
  p_causation_id uuid,
  p_params jsonb,
  p_session_id uuid,
  p_actor_agent_id uuid,
  p_target_type text,
  p_mutation_type text,
  p_auto_apply boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_action_id uuid := gen_random_uuid();
  v_entity jsonb;
  v_outbox_id uuid;
  v_target_id uuid;
  v_comment linear_clone.comments%ROWTYPE;
  v_activity linear_clone.activity_events%ROWTYPE;
  v_inner jsonb;
BEGIN
  -- 1. Action Bus: persist the proposal first (never a direct table write).
  INSERT INTO linear_clone.agent_action_outbox (
    id, workspace_id, session_id, mutation_type, target_type, target_id,
    proposed_payload, status, correlation_id, causation_id
  ) VALUES (
    v_action_id, p_workspace_id, p_session_id, p_mutation_type, p_target_type, NULL,
    p_params, 'proposed', p_correlation_id, p_causation_id
  );

  -- 2. Handoff Queue: destructive/high-impact writes wait for human approve/reject.
  IF NOT p_auto_apply THEN
    RETURN jsonb_build_object(
      'entity', NULL,
      'outbox_event_id', NULL,
      'action_id', v_action_id,
      'status', 'proposed'
    );
  END IF;

  -- 3. Apply path.
  IF p_op = 'create_comment' THEN
    INSERT INTO linear_clone.comments (
      workspace_id, story_id, epic_id, parent_id, body_json, body_md,
      actor_type, author_user_id, author_agent_id, on_behalf_of_user_id, correlation_id
    ) VALUES (
      p_workspace_id,
      (p_params->>'story_id')::uuid,
      (p_params->>'epic_id')::uuid,
      (p_params->>'parent_id')::uuid,
      COALESCE(p_params->'body_json', jsonb_build_object('type', 'text', 'text', p_params->>'body_md')),
      p_params->>'body_md',
      COALESCE((p_params->>'actor_type')::linear_clone.comment_actor_type, 'agent'),
      (p_params->>'author_user_id')::uuid,
      p_actor_agent_id,
      (p_params->>'on_behalf_of_user_id')::uuid,
      p_correlation_id
    )
    RETURNING * INTO v_comment;
    v_entity := to_jsonb(v_comment);
    v_target_id := v_comment.id;
    IF p_topic IS NOT NULL THEN
      v_outbox_id := linear_clone_internal.insert_outbox_event(
        p_workspace_id, p_topic, p_payload, p_correlation_id, p_causation_id
      );
    END IF;

  ELSIF p_op = 'attach_signal' THEN
    INSERT INTO linear_clone.activity_events (
      workspace_id, story_id, epic_id, actor_type, actor_agent_id,
      event_type, payload, correlation_id, causation_id
    ) VALUES (
      p_workspace_id,
      (p_params->>'story_id')::uuid,
      (p_params->>'epic_id')::uuid,
      CASE WHEN p_actor_agent_id IS NOT NULL THEN 'agent'::linear_clone.actor_type
           ELSE 'system'::linear_clone.actor_type END,
      p_actor_agent_id,
      'signal.attached',
      COALESCE(p_params->'signal', p_params),
      p_correlation_id,
      p_causation_id
    )
    RETURNING * INTO v_activity;
    v_entity := to_jsonb(v_activity);
    v_target_id := v_activity.id;
    IF p_topic IS NOT NULL THEN
      v_outbox_id := linear_clone_internal.insert_outbox_event(
        p_workspace_id, p_topic, p_payload, p_correlation_id, p_causation_id
      );
    END IF;

  ELSE
    -- Delegate entity ops (create_epic/update_epic/create_story/update_story/...)
    v_inner := linear_clone_internal.execute_mutation_with_outbox(
      p_op, p_workspace_id, p_topic, p_payload, p_correlation_id, p_causation_id, p_params
    );
    v_entity := v_inner->'entity';
    v_outbox_id := NULLIF(v_inner->>'outbox_event_id', '')::uuid;
    v_target_id := NULLIF(v_entity->>'id', '')::uuid;
  END IF;

  UPDATE linear_clone.agent_action_outbox
    SET status = 'applied', applied_at = now(), target_id = v_target_id
    WHERE id = v_action_id;

  RETURN jsonb_build_object(
    'entity', v_entity,
    'outbox_event_id', v_outbox_id,
    'action_id', v_action_id,
    'status', 'applied'
  );
END;
$$;

REVOKE ALL ON FUNCTION linear_clone_internal.execute_agent_mutation FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone_internal.execute_agent_mutation TO service_role;

CREATE OR REPLACE FUNCTION linear_clone.execute_agent_mutation(
  p_op text,
  p_workspace_id uuid,
  p_topic text,
  p_payload jsonb,
  p_correlation_id uuid,
  p_causation_id uuid DEFAULT NULL,
  p_params jsonb DEFAULT '{}'::jsonb,
  p_session_id uuid DEFAULT NULL,
  p_actor_agent_id uuid DEFAULT NULL,
  p_target_type text DEFAULT 'unknown',
  p_mutation_type text DEFAULT 'unknown',
  p_auto_apply boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT linear_clone_internal.execute_agent_mutation(
    p_op, p_workspace_id, p_topic, p_payload, p_correlation_id, p_causation_id,
    p_params, p_session_id, p_actor_agent_id, p_target_type, p_mutation_type, p_auto_apply
  );
$$;

REVOKE ALL ON FUNCTION linear_clone.execute_agent_mutation FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone.execute_agent_mutation TO service_role;

COMMENT ON FUNCTION linear_clone.execute_agent_mutation IS
  'IDEA-010 Agent Action Bus: proposal → (Handoff Queue | atomic apply) for all MCP/agent writes.';

-- ---------------------------------------------------------------------------
-- ensure_mcp_agent — create a first-class agent principal (app_user) so a user
-- can connect THEIR agent and have it become an assignable/delegable member.
-- Feeds task-09k (agents-as-assignees). Non-billable, mcp_enabled by construction.
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
BEGIN
  -- agents.installed_by is NOT NULL; for app-actor (client_credentials) flows with no
  -- user, fall back to the workspace owner so provisioning still attributes an installer.
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

  INSERT INTO linear_clone.agents (
    workspace_id, app_user_id, display_name, icon_url,
    mentionable, assignable, billable, mcp_enabled, installed_by
  ) VALUES (
    p_workspace_id, gen_random_uuid(), p_display_name, p_icon_url,
    true, true, false, true, v_installed_by
  )
  RETURNING * INTO v_agent;
  RETURN to_jsonb(v_agent);
END;
$$;

REVOKE ALL ON FUNCTION linear_clone_internal.ensure_mcp_agent FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone_internal.ensure_mcp_agent TO service_role;

CREATE OR REPLACE FUNCTION linear_clone.ensure_mcp_agent(
  p_workspace_id uuid,
  p_installed_by uuid,
  p_display_name text,
  p_icon_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT linear_clone_internal.ensure_mcp_agent(
    p_workspace_id, p_installed_by, p_display_name, p_icon_url
  );
$$;

REVOKE ALL ON FUNCTION linear_clone.ensure_mcp_agent FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone.ensure_mcp_agent TO service_role;
