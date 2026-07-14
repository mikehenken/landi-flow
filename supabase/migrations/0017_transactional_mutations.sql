-- G-02: Atomic entity mutation + outbox INSERT in a single Postgres transaction.
-- Controllers call execute_mutation_with_outbox (one RPC round-trip).

CREATE OR REPLACE FUNCTION linear_clone_internal.mutation_result(
  p_entity jsonb,
  p_outbox_event_id uuid
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'entity', p_entity,
    'outbox_event_id', p_outbox_event_id
  );
$$;

CREATE OR REPLACE FUNCTION linear_clone_internal.execute_mutation_with_outbox(
  p_op text,
  p_workspace_id uuid,
  p_topic text,
  p_payload jsonb,
  p_correlation_id uuid,
  p_causation_id uuid,
  p_params jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_entity jsonb;
  v_outbox_id uuid;
  v_row linear_clone.workspaces%ROWTYPE;
  v_epic linear_clone.epics%ROWTYPE;
  v_story linear_clone.stories%ROWTYPE;
  v_milestone linear_clone.milestones%ROWTYPE;
  v_cycle linear_clone.cycles%ROWTYPE;
  v_view linear_clone.views%ROWTYPE;
  v_relation linear_clone.story_relations%ROWTYPE;
  v_ws linear_clone.workflow_states%ROWTYPE;
  v_team_id uuid;
  v_number int;
  v_team_ids jsonb;
  v_elem jsonb;
BEGIN
  CASE p_op
    WHEN 'create_workspace' THEN
      INSERT INTO linear_clone.workspaces (slug, name, icon_url, settings)
      VALUES (
        (p_params->>'slug')::citext,
        p_params->>'name',
        p_params->>'icon_url',
        COALESCE(p_params->'settings', '{}'::jsonb)
      )
      RETURNING * INTO v_row;

      IF p_params ? 'creator_user_id' AND (p_params->>'creator_user_id') IS NOT NULL THEN
        INSERT INTO linear_clone.workspace_members (workspace_id, user_id, role, status, joined_at)
        VALUES (
          v_row.id,
          (p_params->>'creator_user_id')::uuid,
          'owner',
          'active',
          now()
        );
      END IF;

      v_entity := to_jsonb(v_row);
      p_workspace_id := v_row.id;

    WHEN 'update_workspace' THEN
      UPDATE linear_clone.workspaces w
      SET
        name = COALESCE(p_params->>'name', w.name),
        icon_url = COALESCE(p_params->>'icon_url', w.icon_url),
        settings = COALESCE(p_params->'settings', w.settings)
      WHERE w.id = (p_params->>'workspace_id')::uuid
      RETURNING * INTO v_row;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'workspace_not_found';
      END IF;

      v_entity := to_jsonb(v_row);

    WHEN 'create_epic' THEN
      INSERT INTO linear_clone.epics (
        workspace_id, name, slug, status_id, description_md, priority,
        lead_id, start_date, target_date, created_by, correlation_id
      )
      VALUES (
        p_workspace_id,
        p_params->>'name',
        (p_params->>'slug')::citext,
        (p_params->>'status_id')::uuid,
        p_params->>'description_md',
        COALESCE((p_params->>'priority')::linear_clone.epic_priority, 'none'),
        (p_params->>'lead_id')::uuid,
        (p_params->>'start_date')::date,
        (p_params->>'target_date')::date,
        (p_params->>'created_by')::uuid,
        p_correlation_id
      )
      RETURNING * INTO v_epic;

      v_team_ids := p_params->'team_ids';
      IF v_team_ids IS NOT NULL AND jsonb_typeof(v_team_ids) = 'array' THEN
        FOR v_elem IN SELECT * FROM jsonb_array_elements(v_team_ids) LOOP
          INSERT INTO linear_clone.epic_teams (epic_id, team_id)
          VALUES (v_epic.id, (v_elem #>> '{}')::uuid)
          ON CONFLICT DO NOTHING;
        END LOOP;
      END IF;

      v_entity := to_jsonb(v_epic);

    WHEN 'update_epic' THEN
      UPDATE linear_clone.epics e
      SET
        name = COALESCE(p_params->>'name', e.name),
        description_md = COALESCE(p_params->>'description_md', e.description_md),
        status_id = COALESCE((p_params->>'status_id')::uuid, e.status_id),
        priority = COALESCE((p_params->>'priority')::linear_clone.epic_priority, e.priority),
        lead_id = COALESCE((p_params->>'lead_id')::uuid, e.lead_id),
        start_date = COALESCE((p_params->>'start_date')::date, e.start_date),
        target_date = COALESCE((p_params->>'target_date')::date, e.target_date)
      WHERE e.workspace_id = p_workspace_id
        AND e.id = (p_params->>'epic_id')::uuid
      RETURNING * INTO v_epic;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'epic_not_found';
      END IF;

      v_entity := to_jsonb(v_epic);

    WHEN 'create_story' THEN
      v_team_id := (p_params->>'team_id')::uuid;
      v_number := linear_clone_internal.allocate_team_number(v_team_id, 'story');

      INSERT INTO linear_clone.stories (
        workspace_id, team_id, number, identifier, title, description_md,
        workflow_state_id, priority, assignee_id, delegate_agent_id,
        epic_id, milestone_id, cycle_id, estimate, created_by, correlation_id
      )
      VALUES (
        p_workspace_id,
        v_team_id,
        v_number,
        'pending',
        p_params->>'title',
        p_params->>'description_md',
        (p_params->>'workflow_state_id')::uuid,
        COALESCE((p_params->>'priority')::linear_clone.story_priority, 'none'),
        (p_params->>'assignee_id')::uuid,
        (p_params->>'delegate_agent_id')::uuid,
        (p_params->>'epic_id')::uuid,
        (p_params->>'milestone_id')::uuid,
        (p_params->>'cycle_id')::uuid,
        (p_params->>'estimate')::numeric,
        (p_params->>'created_by')::uuid,
        p_correlation_id
      )
      RETURNING * INTO v_story;

      v_entity := to_jsonb(v_story);

    WHEN 'update_story' THEN
      UPDATE linear_clone.stories s
      SET
        title = COALESCE(p_params->>'title', s.title),
        description_md = COALESCE(p_params->>'description_md', s.description_md),
        workflow_state_id = COALESCE((p_params->>'workflow_state_id')::uuid, s.workflow_state_id),
        priority = COALESCE((p_params->>'priority')::linear_clone.story_priority, s.priority),
        assignee_id = COALESCE((p_params->>'assignee_id')::uuid, s.assignee_id),
        delegate_agent_id = COALESCE((p_params->>'delegate_agent_id')::uuid, s.delegate_agent_id),
        epic_id = COALESCE((p_params->>'epic_id')::uuid, s.epic_id),
        milestone_id = COALESCE((p_params->>'milestone_id')::uuid, s.milestone_id),
        cycle_id = COALESCE((p_params->>'cycle_id')::uuid, s.cycle_id),
        estimate = COALESCE((p_params->>'estimate')::numeric, s.estimate),
        sort_order = COALESCE((p_params->>'sort_order')::numeric, s.sort_order)
      WHERE s.workspace_id = p_workspace_id
        AND s.team_id = (p_params->>'team_id')::uuid
        AND s.id = (p_params->>'story_id')::uuid
      RETURNING * INTO v_story;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'story_not_found';
      END IF;

      v_entity := to_jsonb(v_story);

    WHEN 'create_milestone' THEN
      INSERT INTO linear_clone.milestones (
        workspace_id, epic_id, name, description, target_date, position
      )
      VALUES (
        p_workspace_id,
        (p_params->>'epic_id')::uuid,
        p_params->>'name',
        p_params->>'description',
        (p_params->>'target_date')::date,
        COALESCE((p_params->>'position')::int, 0)
      )
      RETURNING * INTO v_milestone;

      v_entity := to_jsonb(v_milestone);

    WHEN 'update_milestone' THEN
      UPDATE linear_clone.milestones m
      SET
        name = COALESCE(p_params->>'name', m.name),
        description = COALESCE(p_params->>'description', m.description),
        target_date = COALESCE((p_params->>'target_date')::date, m.target_date),
        position = COALESCE((p_params->>'position')::int, m.position)
      WHERE m.workspace_id = p_workspace_id
        AND m.epic_id = (p_params->>'epic_id')::uuid
        AND m.id = (p_params->>'milestone_id')::uuid
      RETURNING * INTO v_milestone;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'milestone_not_found';
      END IF;

      v_entity := to_jsonb(v_milestone);

    WHEN 'create_cycle' THEN
      v_team_id := (p_params->>'team_id')::uuid;
      v_number := linear_clone_internal.allocate_team_number(v_team_id, 'cycle');

      INSERT INTO linear_clone.cycles (
        workspace_id, team_id, name, number, starts_at, ends_at, settings
      )
      VALUES (
        p_workspace_id,
        v_team_id,
        p_params->>'name',
        v_number,
        (p_params->>'starts_at')::timestamptz,
        (p_params->>'ends_at')::timestamptz,
        COALESCE(p_params->'settings', '{}'::jsonb)
      )
      RETURNING * INTO v_cycle;

      v_entity := to_jsonb(v_cycle);

    WHEN 'update_cycle' THEN
      UPDATE linear_clone.cycles c
      SET
        name = COALESCE(p_params->>'name', c.name),
        starts_at = COALESCE((p_params->>'starts_at')::timestamptz, c.starts_at),
        ends_at = COALESCE((p_params->>'ends_at')::timestamptz, c.ends_at),
        settings = COALESCE(p_params->'settings', c.settings)
      WHERE c.workspace_id = p_workspace_id
        AND c.team_id = (p_params->>'team_id')::uuid
        AND c.id = (p_params->>'cycle_id')::uuid
      RETURNING * INTO v_cycle;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'cycle_not_found';
      END IF;

      v_entity := to_jsonb(v_cycle);

    WHEN 'complete_cycle' THEN
      UPDATE linear_clone.cycles c
      SET completed_at = now()
      WHERE c.workspace_id = p_workspace_id
        AND c.team_id = (p_params->>'team_id')::uuid
        AND c.id = (p_params->>'cycle_id')::uuid
      RETURNING * INTO v_cycle;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'cycle_not_found';
      END IF;

      v_entity := to_jsonb(v_cycle);

    WHEN 'create_view' THEN
      INSERT INTO linear_clone.views (
        workspace_id, name, scope, layout, team_id, epic_id, owner_id,
        description, filter_ast, display_options, grouping, sub_grouping, is_shared
      )
      VALUES (
        p_workspace_id,
        p_params->>'name',
        (p_params->>'scope')::linear_clone.view_scope,
        COALESCE((p_params->>'layout')::linear_clone.view_layout, 'list'),
        (p_params->>'team_id')::uuid,
        (p_params->>'epic_id')::uuid,
        (p_params->>'owner_id')::uuid,
        p_params->>'description',
        COALESCE(p_params->'filter_ast', '{}'::jsonb),
        COALESCE(p_params->'display_options', '{}'::jsonb),
        p_params->>'grouping',
        p_params->>'sub_grouping',
        COALESCE((p_params->>'is_shared')::boolean, false)
      )
      RETURNING * INTO v_view;

      v_entity := to_jsonb(v_view);

    WHEN 'update_view' THEN
      UPDATE linear_clone.views v
      SET
        name = COALESCE(p_params->>'name', v.name),
        description = COALESCE(p_params->>'description', v.description),
        layout = COALESCE((p_params->>'layout')::linear_clone.view_layout, v.layout),
        filter_ast = COALESCE(p_params->'filter_ast', v.filter_ast),
        display_options = COALESCE(p_params->'display_options', v.display_options),
        grouping = COALESCE(p_params->>'grouping', v.grouping),
        sub_grouping = COALESCE(p_params->>'sub_grouping', v.sub_grouping),
        is_shared = COALESCE((p_params->>'is_shared')::boolean, v.is_shared),
        is_favorited = COALESCE((p_params->>'is_favorited')::boolean, v.is_favorited)
      WHERE v.workspace_id = p_workspace_id
        AND v.id = (p_params->>'view_id')::uuid
      RETURNING * INTO v_view;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'view_not_found';
      END IF;

      v_entity := to_jsonb(v_view);

    WHEN 'delete_view' THEN
      DELETE FROM linear_clone.views v
      WHERE v.workspace_id = p_workspace_id
        AND v.id = (p_params->>'view_id')::uuid
      RETURNING * INTO v_view;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'view_not_found';
      END IF;

      v_entity := to_jsonb(v_view);

    WHEN 'create_story_relation' THEN
      INSERT INTO linear_clone.story_relations (
        workspace_id, source_story_id, target_story_id, relation_type, created_by
      )
      VALUES (
        p_workspace_id,
        (p_params->>'source_story_id')::uuid,
        (p_params->>'target_story_id')::uuid,
        (p_params->>'relation_type')::linear_clone.story_relation_type,
        (p_params->>'created_by')::uuid
      )
      RETURNING * INTO v_relation;

      v_entity := to_jsonb(v_relation);

    WHEN 'delete_story_relation' THEN
      DELETE FROM linear_clone.story_relations sr
      WHERE sr.workspace_id = p_workspace_id
        AND sr.source_story_id = (p_params->>'source_story_id')::uuid
        AND sr.id = (p_params->>'relation_id')::uuid
      RETURNING * INTO v_relation;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'relation_not_found';
      END IF;

      v_entity := to_jsonb(v_relation);

    WHEN 'create_workflow_state' THEN
      v_team_id := (p_params->>'team_id')::uuid;
      PERFORM linear_clone_internal.ensure_default_workflow_states(v_team_id);

      INSERT INTO linear_clone.workflow_states (
        team_id, name, category, position, color, is_default
      )
      VALUES (
        v_team_id,
        p_params->>'name',
        (p_params->>'category')::linear_clone.workflow_category,
        COALESCE((p_params->>'position')::int, 0),
        p_params->>'color',
        COALESCE((p_params->>'is_default')::boolean, false)
      )
      RETURNING * INTO v_ws;

      v_entity := to_jsonb(v_ws);

    ELSE
      RAISE EXCEPTION 'unknown_mutation_op: %', p_op;
  END CASE;

  IF p_topic IS NOT NULL THEN
    v_outbox_id := linear_clone_internal.insert_outbox_event(
      p_workspace_id,
      p_topic,
      p_payload,
      p_correlation_id,
      p_causation_id
    );
  END IF;

  RETURN linear_clone_internal.mutation_result(v_entity, v_outbox_id);
END;
$$;

REVOKE ALL ON FUNCTION linear_clone_internal.execute_mutation_with_outbox FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone_internal.execute_mutation_with_outbox TO service_role;

CREATE OR REPLACE FUNCTION linear_clone.execute_mutation_with_outbox(
  p_op text,
  p_workspace_id uuid,
  p_topic text,
  p_payload jsonb,
  p_correlation_id uuid,
  p_causation_id uuid DEFAULT NULL,
  p_params jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT linear_clone_internal.execute_mutation_with_outbox(
    p_op,
    p_workspace_id,
    p_topic,
    p_payload,
    p_correlation_id,
    p_causation_id,
    p_params
  );
$$;

REVOKE ALL ON FUNCTION linear_clone.execute_mutation_with_outbox FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone.execute_mutation_with_outbox TO service_role;

COMMENT ON FUNCTION linear_clone.execute_mutation_with_outbox IS
  'G-02: entity DML + outbox_events INSERT in one Postgres transaction (transactional outbox).';
