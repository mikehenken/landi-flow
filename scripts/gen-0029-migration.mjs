import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = fs
  .readFileSync(path.join(root, 'supabase/migrations/0023_task09e_mutations.sql'), 'utf8')
  .replace(/\r\n/g, '\n');

const header = `-- STUDY-013 task-09m — Real Supabase persistence for customers + workspace member admin CRUD.

CREATE TYPE linear_clone.customer_status AS ENUM ('active', 'inactive', 'churned');

CREATE TABLE linear_clone.customers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  name            text NOT NULL,
  domain          citext NOT NULL,
  tier            text,
  revenue         numeric(14, 2),
  status          linear_clone.customer_status NOT NULL DEFAULT 'active',
  created_by      uuid REFERENCES auth.users(id),
  archived_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, domain)
);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON linear_clone.customers
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE INDEX customers_workspace_active_idx
  ON linear_clone.customers (workspace_id, updated_at DESC)
  WHERE archived_at IS NULL;

ALTER TABLE linear_clone.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.customers FORCE ROW LEVEL SECURITY;

CREATE POLICY customers_select ON linear_clone.customers
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY customers_insert ON linear_clone.customers
  FOR INSERT TO authenticated
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY customers_update ON linear_clone.customers
  FOR UPDATE TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id))
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY customers_delete ON linear_clone.customers
  FOR DELETE TO authenticated
  USING (linear_clone.is_workspace_admin(workspace_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON linear_clone.customers TO authenticated;

CREATE OR REPLACE FUNCTION linear_clone_internal.ensure_default_epic_statuses(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO linear_clone.epic_statuses (workspace_id, name, category, position)
  VALUES
    (p_workspace_id, 'Backlog', 'backlog', 0),
    (p_workspace_id, 'Planned', 'planned', 1),
    (p_workspace_id, 'In Progress', 'in_progress', 2),
    (p_workspace_id, 'Completed', 'completed', 3),
    (p_workspace_id, 'Cancelled', 'cancelled', 4)
  ON CONFLICT (workspace_id, name) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION linear_clone_internal.ensure_default_epic_statuses FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone_internal.ensure_default_epic_statuses TO service_role;

CREATE OR REPLACE FUNCTION linear_clone.ensure_default_epic_statuses(p_workspace_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT linear_clone_internal.ensure_default_epic_statuses(p_workspace_id);
$$;

REVOKE ALL ON FUNCTION linear_clone.ensure_default_epic_statuses FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone.ensure_default_epic_statuses TO authenticated, service_role;

`;

const fnStart = src.indexOf(
  'CREATE OR REPLACE FUNCTION linear_clone_internal.execute_mutation_with_outbox',
);
let fn = src.slice(fnStart);

fn = fn.replace(
  'v_webhook linear_clone.webhooks%ROWTYPE;',
  `v_webhook linear_clone.webhooks%ROWTYPE;
  v_customer linear_clone.customers%ROWTYPE;
  v_member linear_clone.workspace_members%ROWTYPE;`,
);

fn = fn.replace(
  'PERFORM linear_clone_internal.seed_workspace_entitlements(v_row.id);',
  `PERFORM linear_clone_internal.seed_workspace_entitlements(v_row.id);
      PERFORM linear_clone_internal.ensure_default_epic_statuses(v_row.id);`,
);

fn = fn.replace(
  "lead_id = COALESCE((p_params->>'lead_id')::uuid, e.lead_id),",
  `lead_id = COALESCE((p_params->>'lead_id')::uuid, e.lead_id),
        delegate_agent_id = CASE WHEN p_params ? 'delegate_agent_id'
          THEN (p_params->>'delegate_agent_id')::uuid ELSE e.delegate_agent_id END,`,
);

fn = fn.replace(
  "delegate_agent_id = COALESCE((p_params->>'delegate_agent_id')::uuid, s.delegate_agent_id),",
  `delegate_agent_id = CASE WHEN p_params ? 'delegate_agent_id'
          THEN (p_params->>'delegate_agent_id')::uuid ELSE s.delegate_agent_id END,`,
);

const newOps = `
    WHEN 'archive_epic' THEN
      UPDATE linear_clone.epics e
      SET archived_at = now()
      WHERE e.workspace_id = p_workspace_id
        AND e.id = (p_params->>'epic_id')::uuid
        AND e.archived_at IS NULL
      RETURNING * INTO v_epic;
      IF NOT FOUND THEN RAISE EXCEPTION 'epic_not_found'; END IF;
      v_entity := to_jsonb(v_epic);

    WHEN 'archive_story' THEN
      UPDATE linear_clone.stories s
      SET archived_at = now()
      WHERE s.workspace_id = p_workspace_id
        AND s.team_id = (p_params->>'team_id')::uuid
        AND s.id = (p_params->>'story_id')::uuid
        AND s.archived_at IS NULL
      RETURNING * INTO v_story;
      IF NOT FOUND THEN RAISE EXCEPTION 'story_not_found'; END IF;
      v_entity := to_jsonb(v_story);

    WHEN 'create_customer' THEN
      INSERT INTO linear_clone.customers (
        workspace_id, name, domain, tier, revenue, status, created_by
      )
      VALUES (
        p_workspace_id,
        p_params->>'name',
        (p_params->>'domain')::citext,
        p_params->>'tier',
        (p_params->>'revenue')::numeric,
        COALESCE((p_params->>'status')::linear_clone.customer_status, 'active'),
        (p_params->>'created_by')::uuid
      )
      RETURNING * INTO v_customer;
      v_entity := to_jsonb(v_customer);

    WHEN 'update_customer' THEN
      UPDATE linear_clone.customers c
      SET
        name = COALESCE(p_params->>'name', c.name),
        domain = COALESCE((p_params->>'domain')::citext, c.domain),
        tier = COALESCE(p_params->>'tier', c.tier),
        revenue = COALESCE((p_params->>'revenue')::numeric, c.revenue),
        status = COALESCE((p_params->>'status')::linear_clone.customer_status, c.status)
      WHERE c.workspace_id = p_workspace_id
        AND c.id = (p_params->>'customer_id')::uuid
        AND c.archived_at IS NULL
      RETURNING * INTO v_customer;
      IF NOT FOUND THEN RAISE EXCEPTION 'customer_not_found'; END IF;
      v_entity := to_jsonb(v_customer);

    WHEN 'delete_customer' THEN
      UPDATE linear_clone.customers c
      SET archived_at = now()
      WHERE c.workspace_id = p_workspace_id
        AND c.id = (p_params->>'customer_id')::uuid
        AND c.archived_at IS NULL
      RETURNING * INTO v_customer;
      IF NOT FOUND THEN RAISE EXCEPTION 'customer_not_found'; END IF;
      v_entity := to_jsonb(v_customer);

    WHEN 'invite_workspace_member' THEN
      INSERT INTO linear_clone.workspace_members (
        workspace_id, user_id, role, status, invited_by, joined_at
      )
      VALUES (
        p_workspace_id,
        (p_params->>'user_id')::uuid,
        COALESCE((p_params->>'role')::linear_clone.workspace_member_role, 'member'),
        COALESCE((p_params->>'status')::linear_clone.workspace_member_status, 'pending'),
        (p_params->>'invited_by')::uuid,
        CASE
          WHEN COALESCE(p_params->>'status', 'pending') = 'active' THEN now()
          ELSE NULL
        END
      )
      RETURNING * INTO v_member;
      v_entity := to_jsonb(v_member);

    WHEN 'update_workspace_member' THEN
      UPDATE linear_clone.workspace_members wm
      SET
        role = COALESCE((p_params->>'role')::linear_clone.workspace_member_role, wm.role),
        status = COALESCE((p_params->>'status')::linear_clone.workspace_member_status, wm.status),
        joined_at = CASE
          WHEN COALESCE(p_params->>'status', wm.status::text) = 'active' AND wm.joined_at IS NULL
            THEN now()
          ELSE wm.joined_at
        END
      WHERE wm.workspace_id = p_workspace_id
        AND wm.id = (p_params->>'member_id')::uuid
      RETURNING * INTO v_member;
      IF NOT FOUND THEN RAISE EXCEPTION 'workspace_member_not_found'; END IF;
      v_entity := to_jsonb(v_member);

    WHEN 'remove_workspace_member' THEN
      DELETE FROM linear_clone.workspace_members wm
      WHERE wm.workspace_id = p_workspace_id
        AND wm.id = (p_params->>'member_id')::uuid
      RETURNING * INTO v_member;
      IF NOT FOUND THEN RAISE EXCEPTION 'workspace_member_not_found'; END IF;
      v_entity := to_jsonb(v_member);
`;

const elsePattern =
  /(\s+WHEN 'delete_webhook' THEN[\s\S]*?v_entity := to_jsonb\(v_webhook\);\s+)ELSE\s+RAISE EXCEPTION 'unknown_mutation_op: %', p_op;/;
if (!elsePattern.test(fn)) {
  throw new Error('Could not locate delete_webhook ELSE branch in 0023 mutation function');
}
fn = fn.replace(elsePattern, `$1${newOps}\n    ELSE\n      RAISE EXCEPTION 'unknown_mutation_op: %', p_op;`);

const out = header + fn;
fs.writeFileSync(path.join(root, 'supabase/migrations/0029_task09m_persistence.sql'), out);
console.log('Wrote 0029_task09m_persistence.sql', out.length, 'bytes');
