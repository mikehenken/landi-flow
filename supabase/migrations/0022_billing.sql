-- STUDY-013 task-09e: Stripe-backed billing, entitlements, AI usage metering

CREATE TABLE linear_clone.subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL UNIQUE REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_key        text NOT NULL DEFAULT 'free',
  status          text NOT NULL DEFAULT 'active',
  current_period_end timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON linear_clone.subscriptions
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE TABLE linear_clone.entitlements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  feature_key     text NOT NULL,
  enabled         boolean NOT NULL DEFAULT false,
  limits          jsonb NOT NULL DEFAULT '{}'::jsonb,
  source          text NOT NULL DEFAULT 'plan',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, feature_key)
);

CREATE TABLE linear_clone.ai_gateway_usage (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  agent_id        uuid REFERENCES linear_clone.agents(id),
  user_id         uuid REFERENCES auth.users(id),
  credential_id   uuid,
  provider        text NOT NULL,
  model           text NOT NULL,
  tokens_in       int NOT NULL DEFAULT 0,
  tokens_out      int NOT NULL DEFAULT 0,
  cost_usd        numeric(12,6) NOT NULL DEFAULT 0,
  cached          boolean NOT NULL DEFAULT false,
  correlation_id  uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_gateway_usage_workspace_created_idx
  ON linear_clone.ai_gateway_usage (workspace_id, created_at DESC);

CREATE TABLE linear_clone.audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid REFERENCES linear_clone.workspaces(id),
  actor_user_id   uuid REFERENCES auth.users(id),
  actor_agent_id  uuid REFERENCES linear_clone.agents(id),
  action          text NOT NULL,
  resource_type   text,
  resource_id     uuid,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip              inet,
  correlation_id  uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_workspace_created_idx ON linear_clone.audit_log (workspace_id, created_at DESC);

-- Default free-plan entitlements for new workspaces
CREATE OR REPLACE FUNCTION linear_clone_internal.seed_workspace_entitlements(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO linear_clone.entitlements (workspace_id, feature_key, enabled, limits, source)
  VALUES
    (p_workspace_id, 'core_pm', true, '{}'::jsonb, 'plan'),
    (p_workspace_id, 'agents_mcp', false, '{"max_agents": 0}'::jsonb, 'plan'),
    (p_workspace_id, 'customer_requests', false, '{}'::jsonb, 'plan'),
    (p_workspace_id, 'extensions_marketplace', true, '{"max_installs": 5}'::jsonb, 'plan')
  ON CONFLICT (workspace_id, feature_key) DO NOTHING;

  INSERT INTO linear_clone.subscriptions (workspace_id, plan_key, status)
  VALUES (p_workspace_id, 'free', 'active')
  ON CONFLICT (workspace_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION linear_clone_internal.seed_workspace_entitlements FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone_internal.seed_workspace_entitlements TO service_role;

-- Stripe webhook sync (service role only)
CREATE OR REPLACE FUNCTION linear_clone.sync_subscription_from_stripe(
  p_workspace_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_plan_key text,
  p_status text,
  p_current_period_end timestamptz,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sub linear_clone.subscriptions%ROWTYPE;
  v_outbox_id uuid;
  v_agents_enabled boolean;
BEGIN
  INSERT INTO linear_clone.subscriptions (
    workspace_id, stripe_customer_id, stripe_subscription_id,
    plan_key, status, current_period_end
  )
  VALUES (
    p_workspace_id, p_stripe_customer_id, p_stripe_subscription_id,
    p_plan_key, p_status, p_current_period_end
  )
  ON CONFLICT (workspace_id) DO UPDATE SET
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    plan_key = EXCLUDED.plan_key,
    status = EXCLUDED.status,
    current_period_end = EXCLUDED.current_period_end,
    updated_at = now()
  RETURNING * INTO v_sub;

  v_agents_enabled := p_plan_key IN ('pro', 'business', 'enterprise');

  UPDATE linear_clone.entitlements
  SET enabled = v_agents_enabled, limits = CASE WHEN v_agents_enabled THEN '{"max_agents": 10}'::jsonb ELSE '{"max_agents": 0}'::jsonb END, updated_at = now()
  WHERE workspace_id = p_workspace_id AND feature_key = 'agents_mcp';

  UPDATE linear_clone.entitlements
  SET enabled = (p_plan_key <> 'free'), updated_at = now()
  WHERE workspace_id = p_workspace_id AND feature_key = 'customer_requests';

  v_outbox_id := linear_clone_internal.insert_outbox_event(
    p_workspace_id,
    'billing.entitlement_changed',
    jsonb_build_object(
      'workspace_id', p_workspace_id,
      'plan_key', p_plan_key,
      'status', p_status,
      'correlation_id', p_correlation_id
    ),
    p_correlation_id,
    NULL
  );

  RETURN jsonb_build_object('subscription', to_jsonb(v_sub), 'outbox_event_id', v_outbox_id);
END;
$$;

REVOKE ALL ON FUNCTION linear_clone.sync_subscription_from_stripe FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone.sync_subscription_from_stripe TO service_role;
