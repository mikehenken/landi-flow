-- STUDY-013 task-09k — Agents as FIRST-CLASS ASSIGNEES.
-- Study differentiator: a connected AI agent (task-09d MCP credential system) is an
-- assignable/mentionable workspace member exactly like a human developer, and can be
-- assigned to Stories AND Epics. Assignment goes through the Agent Action Bus so an
-- agent that gets assigned can act (comment / update / attach signals) with a full
-- proposal → apply audit trail.
--
-- This migration:
--   1. Adds `delegate_agent_id` to Epics (Stories already had it in 0008) so an agent
--      can be assigned to an Epic like a human `lead_id`.
--   2. Adds first-class `assign_story` / `assign_epic` Action Bus ops that can SET *or
--      CLEAR* the human owner and the agent delegate (COALESCE update paths cannot
--      unassign; explicit assignment must be able to null a field).
--   3. Adds `list_assignable_members` — one unified roster of humans + agents — so the
--      UI and MCP surface the same "members" list (agents alongside humans).

-- ---------------------------------------------------------------------------
-- 1. Epics can be delegated to an agent (agents assignable to Epics, not just Stories)
-- ---------------------------------------------------------------------------
ALTER TABLE linear_clone.epics
  ADD COLUMN IF NOT EXISTS delegate_agent_id uuid REFERENCES linear_clone.agents(id);

CREATE INDEX IF NOT EXISTS epics_delegate_agent_idx
  ON linear_clone.epics (delegate_agent_id)
  WHERE delegate_agent_id IS NOT NULL;

COMMENT ON COLUMN linear_clone.epics.delegate_agent_id IS
  'task-09k: agent assigned to drive this Epic (first-class assignee, alongside human lead_id).';

-- ---------------------------------------------------------------------------
-- 2. Agent Action Bus: add explicit assign_story / assign_epic ops.
--    Redefines execute_agent_mutation (0021) additively — every prior op is preserved;
--    two new inline branches handle assignment with null-clearing semantics.
--    Presence of a key in p_params means "apply it" (including an explicit null);
--    absence means "leave unchanged".
-- ---------------------------------------------------------------------------
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
  v_story linear_clone.stories%ROWTYPE;
  v_epic linear_clone.epics%ROWTYPE;
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

  ELSIF p_op = 'assign_story' THEN
    -- First-class Story assignment: set/clear human owner and/or agent delegate.
    UPDATE linear_clone.stories s
    SET
      assignee_id = CASE WHEN p_params ? 'assignee_id'
                         THEN (p_params->>'assignee_id')::uuid ELSE s.assignee_id END,
      delegate_agent_id = CASE WHEN p_params ? 'delegate_agent_id'
                               THEN (p_params->>'delegate_agent_id')::uuid ELSE s.delegate_agent_id END
    WHERE s.workspace_id = p_workspace_id
      AND s.id = (p_params->>'story_id')::uuid
    RETURNING * INTO v_story;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'story_not_found';
    END IF;
    v_entity := to_jsonb(v_story);
    v_target_id := v_story.id;
    IF p_topic IS NOT NULL THEN
      v_outbox_id := linear_clone_internal.insert_outbox_event(
        p_workspace_id, p_topic, p_payload, p_correlation_id, p_causation_id
      );
    END IF;

  ELSIF p_op = 'assign_epic' THEN
    -- First-class Epic assignment: set/clear human lead and/or agent delegate.
    UPDATE linear_clone.epics e
    SET
      lead_id = CASE WHEN p_params ? 'lead_id'
                     THEN (p_params->>'lead_id')::uuid ELSE e.lead_id END,
      delegate_agent_id = CASE WHEN p_params ? 'delegate_agent_id'
                               THEN (p_params->>'delegate_agent_id')::uuid ELSE e.delegate_agent_id END
    WHERE e.workspace_id = p_workspace_id
      AND e.id = (p_params->>'epic_id')::uuid
    RETURNING * INTO v_epic;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'epic_not_found';
    END IF;
    v_entity := to_jsonb(v_epic);
    v_target_id := v_epic.id;
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

-- ---------------------------------------------------------------------------
-- 3. Unified assignable-members roster (humans + agents). One list, one shape, so the
--    UI and MCP present agents as first-class members alongside people.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION linear_clone_internal.list_assignable_members(
  p_workspace_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(jsonb_agg(m ORDER BY m->>'kind' DESC, m->>'name'), '[]'::jsonb)
  FROM (
    -- Humans: active workspace members.
    SELECT jsonb_build_object(
      'kind', 'human',
      'id', wm.user_id,
      'name', COALESCE(p.display_name, 'Member'),
      'avatar_url', p.avatar_url,
      'assignable', true,
      'mentionable', true,
      'presence', 'offline',
      'subtitle', wm.role::text
    ) AS m
    FROM linear_clone.workspace_members wm
    LEFT JOIN linear_clone.profiles p ON p.user_id = wm.user_id
    WHERE wm.workspace_id = p_workspace_id
      AND wm.status = 'active'

    UNION ALL

    -- Agents: first-class members provisioned via the MCP credential system.
    SELECT jsonb_build_object(
      'kind', 'agent',
      'id', a.id,
      'name', a.display_name,
      'avatar_url', a.icon_url,
      'assignable', a.assignable,
      'mentionable', a.mentionable,
      'presence', CASE WHEN a.mcp_enabled THEN 'online' ELSE 'offline' END,
      'subtitle', CASE WHEN a.mcp_enabled THEN 'MCP agent' ELSE 'Agent' END
    ) AS m
    FROM linear_clone.agents a
    WHERE a.workspace_id = p_workspace_id
      AND a.assignable = true
  ) rows;
$$;

CREATE OR REPLACE FUNCTION linear_clone.list_assignable_members(
  p_workspace_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Callers must be a member of the workspace (service_role bypasses via GRANT).
  IF (SELECT auth.uid()) IS NOT NULL
     AND NOT linear_clone.is_workspace_member(p_workspace_id) THEN
    RAISE EXCEPTION 'not_a_workspace_member';
  END IF;
  RETURN linear_clone_internal.list_assignable_members(p_workspace_id);
END;
$$;

REVOKE ALL ON FUNCTION linear_clone.list_assignable_members FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone.list_assignable_members TO authenticated;
GRANT EXECUTE ON FUNCTION linear_clone.list_assignable_members TO service_role;

COMMENT ON FUNCTION linear_clone.list_assignable_members IS
  'task-09k: unified assignee roster — active human members + assignable agents in one shape.';
