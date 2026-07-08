-- Bug fix: create_story duplicate key on stories_identifier_unique.
--
-- Root cause:
--   * Story identifiers are `team.key || '-' || number` (trigger in 0008).
--   * teams.key is UNIQUE only per workspace (UNIQUE (workspace_id, key) in 0002),
--     so every workspace auto-creates a default "General" team with key 'GEN'.
--   * But stories_identifier_unique (0008) was a GLOBAL unique index on
--     (identifier) alone. Per-team counters restart at 1 in each workspace, so
--     the first story in a second workspace's GEN team produces 'GEN-1', which
--     collides with the first workspace's 'GEN-1'.
--   * allocate_team_number (0016) also trusted team_entity_counters.next_number
--     blindly, so any rows inserted outside the counter (seeds, CSV import) left
--     the counter behind max(number) and could collide within a single team.
--
-- Fix (non-destructive — index swap + function replacement, no data loss):
--   1. Scope the identifier uniqueness to (workspace_id, identifier), matching the
--      per-workspace identifier namespace the product intends.
--   2. Harden allocate_team_number to derive the next number from
--      GREATEST(counter.next_number, MAX(existing number) + 1) so it survives
--      seeded/imported rows and repeated creates. Applies to story + cycle.

-- 1) Workspace-scoped identifier uniqueness.
DROP INDEX IF EXISTS linear_clone.stories_identifier_unique;
CREATE UNIQUE INDEX stories_identifier_unique
  ON linear_clone.stories (workspace_id, identifier);

-- 2) Robust, seed-safe team number allocation.
CREATE OR REPLACE FUNCTION linear_clone_internal.allocate_team_number(
  p_team_id uuid,
  p_entity_type text
)
RETURNS int
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_number int;
  v_max_existing int := 0;
BEGIN
  -- Highest number already used by this team+entity, so the counter self-heals
  -- past rows created outside allocate_team_number (seeds, CSV import, restores).
  IF p_entity_type = 'story' THEN
    SELECT COALESCE(MAX(number), 0) INTO v_max_existing
    FROM linear_clone.stories WHERE team_id = p_team_id;
  ELSIF p_entity_type = 'cycle' THEN
    SELECT COALESCE(MAX(number), 0) INTO v_max_existing
    FROM linear_clone.cycles WHERE team_id = p_team_id;
  END IF;

  INSERT INTO linear_clone_internal.team_entity_counters (team_id, entity_type, next_number)
  VALUES (p_team_id, p_entity_type, v_max_existing + 2)
  ON CONFLICT (team_id, entity_type)
  DO UPDATE SET next_number =
    GREATEST(linear_clone_internal.team_entity_counters.next_number, v_max_existing + 1) + 1
  RETURNING next_number - 1 INTO v_number;

  RETURN v_number;
END;
$$;

REVOKE ALL ON FUNCTION linear_clone_internal.allocate_team_number(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone_internal.allocate_team_number(uuid, text) TO service_role;

NOTIFY pgrst, 'reload schema';
