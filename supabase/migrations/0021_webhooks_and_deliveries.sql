-- STUDY-013 task-09e: Outbound webhooks + delivery queue (event-driven outbox fan-out)

CREATE TYPE linear_clone.webhook_delivery_status AS ENUM (
  'pending', 'delivered', 'failed', 'dead_letter'
);

CREATE TABLE linear_clone.webhooks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  app_id          uuid REFERENCES linear_clone.oauth_apps(id),
  url             text NOT NULL,
  signing_secret_hash text NOT NULL,
  resource_types  text[] NOT NULL DEFAULT '{}',
  team_id         uuid REFERENCES linear_clone.teams(id),
  all_public_teams boolean NOT NULL DEFAULT false,
  enabled         boolean NOT NULL DEFAULT true,
  failure_count   int NOT NULL DEFAULT 0,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER webhooks_set_updated_at
  BEFORE UPDATE ON linear_clone.webhooks
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE INDEX webhooks_workspace_enabled_idx ON linear_clone.webhooks (workspace_id) WHERE enabled = true;

-- Service-role only: plaintext signing secret for outbound HMAC delivery
CREATE TABLE linear_clone_internal.webhook_signing_secrets (
  webhook_id      uuid PRIMARY KEY REFERENCES linear_clone.webhooks(id) ON DELETE CASCADE,
  secret          text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON linear_clone_internal.webhook_signing_secrets FROM PUBLIC;
GRANT ALL ON linear_clone_internal.webhook_signing_secrets TO service_role;

CREATE TABLE linear_clone.webhook_deliveries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id      uuid NOT NULL REFERENCES linear_clone.webhooks(id) ON DELETE CASCADE,
  outbox_event_id uuid REFERENCES linear_clone.outbox_events(id),
  delivery_uuid   uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  event_topic     text NOT NULL,
  signature       text NOT NULL DEFAULT '',
  timestamp       timestamptz NOT NULL DEFAULT now(),
  response_status int,
  attempt         int NOT NULL DEFAULT 1,
  next_retry_at   timestamptz,
  status          linear_clone.webhook_delivery_status NOT NULL DEFAULT 'pending',
  correlation_id  uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX webhook_deliveries_retry_idx
  ON linear_clone.webhook_deliveries (webhook_id, status, next_retry_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX webhook_deliveries_outbox_idx ON linear_clone.webhook_deliveries (outbox_event_id);

-- Claim pending outbox events for poller (fair SKIP LOCKED)
CREATE OR REPLACE FUNCTION linear_clone.claim_pending_outbox_events(p_limit int DEFAULT 50)
RETURNS SETOF linear_clone.outbox_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT oe.id
    FROM linear_clone.outbox_events oe
    WHERE oe.status = 'pending'
    ORDER BY oe.created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE linear_clone.outbox_events oe
  SET status = 'published', published_at = now()
  FROM claimed c
  WHERE oe.id = c.id
  RETURNING oe.*;
END;
$$;

REVOKE ALL ON FUNCTION linear_clone.claim_pending_outbox_events FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone.claim_pending_outbox_events TO service_role;

-- Schedule webhook deliveries for a published outbox event
CREATE OR REPLACE FUNCTION linear_clone.schedule_webhook_deliveries(p_outbox_event_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event linear_clone.outbox_events%ROWTYPE;
  v_webhook linear_clone.webhooks%ROWTYPE;
  v_count int := 0;
  v_topic_prefix text;
BEGIN
  SELECT * INTO v_event FROM linear_clone.outbox_events WHERE id = p_outbox_event_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_topic_prefix := split_part(v_event.topic, '.', 1) || '.';

  FOR v_webhook IN
    SELECT w.*
    FROM linear_clone.webhooks w
    WHERE w.workspace_id = v_event.workspace_id
      AND w.enabled = true
      AND (
        cardinality(w.resource_types) = 0
        OR v_event.topic = ANY (w.resource_types)
        OR v_topic_prefix = ANY (w.resource_types)
      )
  LOOP
    INSERT INTO linear_clone.webhook_deliveries (
      webhook_id, outbox_event_id, event_topic, correlation_id, status, timestamp
    ) VALUES (
      v_webhook.id,
      v_event.id,
      v_event.topic,
      v_event.correlation_id,
      'pending',
      now()
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION linear_clone.schedule_webhook_deliveries FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone.schedule_webhook_deliveries TO service_role;

-- Claim pending webhook deliveries for HTTP dispatch
CREATE OR REPLACE FUNCTION linear_clone.claim_pending_webhook_deliveries(p_limit int DEFAULT 25)
RETURNS TABLE (
  delivery_id uuid,
  webhook_id uuid,
  webhook_url text,
  signing_secret text,
  outbox_event_id uuid,
  event_topic text,
  payload jsonb,
  correlation_id uuid,
  attempt int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT wd.id
    FROM linear_clone.webhook_deliveries wd
    WHERE wd.status IN ('pending', 'failed')
      AND (wd.next_retry_at IS NULL OR wd.next_retry_at <= now())
    ORDER BY wd.created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  ),
  bumped AS (
    UPDATE linear_clone.webhook_deliveries wd
    SET attempt = wd.attempt + 1
    FROM due d
    WHERE wd.id = d.id
    RETURNING wd.*
  )
  SELECT
    b.id AS delivery_id,
    b.webhook_id,
    w.url AS webhook_url,
    s.secret AS signing_secret,
    b.outbox_event_id,
    b.event_topic,
    oe.payload,
    b.correlation_id,
    b.attempt
  FROM bumped b
  JOIN linear_clone.webhooks w ON w.id = b.webhook_id
  JOIN linear_clone_internal.webhook_signing_secrets s ON s.webhook_id = w.id
  LEFT JOIN linear_clone.outbox_events oe ON oe.id = b.outbox_event_id
  WHERE w.enabled = true;
END;
$$;

REVOKE ALL ON FUNCTION linear_clone.claim_pending_webhook_deliveries FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone.claim_pending_webhook_deliveries TO service_role;

-- Record delivery outcome
CREATE OR REPLACE FUNCTION linear_clone.complete_webhook_delivery(
  p_delivery_id uuid,
  p_response_status int,
  p_signature text,
  p_success boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempt int;
  v_webhook_id uuid;
  v_max_attempts int := 5;
BEGIN
  SELECT attempt, webhook_id INTO v_attempt, v_webhook_id
  FROM linear_clone.webhook_deliveries WHERE id = p_delivery_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF p_success THEN
    UPDATE linear_clone.webhook_deliveries
    SET status = 'delivered', response_status = p_response_status, signature = p_signature
    WHERE id = p_delivery_id;

    UPDATE linear_clone.webhooks SET failure_count = 0 WHERE id = v_webhook_id;
  ELSIF v_attempt >= v_max_attempts THEN
    UPDATE linear_clone.webhook_deliveries
    SET status = 'dead_letter', response_status = p_response_status, signature = p_signature
    WHERE id = p_delivery_id;

    UPDATE linear_clone.webhooks SET failure_count = failure_count + 1 WHERE id = v_webhook_id;
  ELSE
    UPDATE linear_clone.webhook_deliveries
    SET
      status = 'failed',
      response_status = p_response_status,
      signature = p_signature,
      next_retry_at = now() + (power(2, v_attempt) * interval '10 seconds')
    WHERE id = p_delivery_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION linear_clone.complete_webhook_delivery FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone.complete_webhook_delivery TO service_role;
