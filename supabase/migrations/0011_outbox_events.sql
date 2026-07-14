-- Transactional outbox (domain events). Entity mutation + outbox INSERT atomically via execute_mutation_with_outbox RPC.
CREATE TABLE linear_clone.outbox_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  topic           text NOT NULL,
  payload         jsonb NOT NULL,
  correlation_id  uuid NOT NULL,
  causation_id    uuid,
  status          linear_clone.outbox_event_status NOT NULL DEFAULT 'pending',
  retry_count     int NOT NULL DEFAULT 0,
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX outbox_events_pending_idx ON linear_clone.outbox_events (status, created_at)
  WHERE status = 'pending';

CREATE INDEX outbox_events_workspace_created_idx ON linear_clone.outbox_events (workspace_id, created_at);

-- Atomic entity + outbox helper for Workers (service role)
CREATE OR REPLACE FUNCTION linear_clone_internal.insert_outbox_event(
  p_workspace_id uuid,
  p_topic text,
  p_payload jsonb,
  p_correlation_id uuid,
  p_causation_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO linear_clone.outbox_events
    (id, workspace_id, topic, payload, correlation_id, causation_id, status)
  VALUES
    (v_id, p_workspace_id, p_topic, p_payload, p_correlation_id, p_causation_id, 'pending');
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION linear_clone_internal.insert_outbox_event FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone_internal.insert_outbox_event TO service_role;

-- PostgREST-exposed wrapper (service role only)
CREATE OR REPLACE FUNCTION linear_clone.insert_outbox_event(
  p_workspace_id uuid,
  p_topic text,
  p_payload jsonb,
  p_correlation_id uuid,
  p_causation_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT linear_clone_internal.insert_outbox_event(
    p_workspace_id, p_topic, p_payload, p_correlation_id, p_causation_id
  );
$$;

REVOKE ALL ON FUNCTION linear_clone.insert_outbox_event FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone.insert_outbox_event TO service_role;
